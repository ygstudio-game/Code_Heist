'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'sonner';

export interface AuctionBid {
  id: string;
  amount: number;
  team: { id: string; name: string };
  createdAt: string;
}

export interface AuctionSnippet {
  id: string;
  title: string;
  category: string;
  buggyCode: string;
}

export interface AuctionState {
  active: boolean;
  auction: {
    id: string;
    timeLeft: number;
    highestBid: AuctionBid | null;
    totalBids: number;
    endTime: string;
    snippet: AuctionSnippet;
    isPreview?: boolean;
    inactivityDeadline?: string;
  } | null;
}

export function useAuction() {
  const { socket, isConnected, joinAuctionRoom } = useSocket();
  const [auctionState, setAuctionState] = useState<AuctionState>({ active: false, auction: null });
  const [history, setHistory] = useState<AuctionBid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inactivityTimeLeft, setInactivityTimeLeft] = useState<number | null>(null);

  const fetchActiveAuction = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/auction/active');
      if (res.ok) {
        const data = await res.json();
        setAuctionState(data);
        if (data.active && data.auction) {
          // Fetch bids for history if auction is active
          // To keep it simple, we just set the highest bid in the history for now
          // A full history endpoint could be fetched here if needed
          if (data.auction.highestBid) {
            setHistory([{
              ...data.auction.highestBid,
            }]);
          } else {
             setHistory([]);
          }
        } else {
          setHistory([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch active auction:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveAuction();
  }, [fetchActiveAuction]);

  useEffect(() => {
    if (isConnected && socket) {
      joinAuctionRoom();

      socket.on('auction:started', (data) => {
        const type = data.isPreview ? 'PREVIEW' : 'AUCTION';
        toast.info(`NEW ${type} DETECTED: ${data.snippet.title}`, {
          style: { background: '#131620', border: '1px solid #00E5FF' }
        });
        
        // Update local state directly to avoid extra fetch if possible, or just refetch
        fetchActiveAuction();
      });

      socket.on('auction:ended', (data) => {
        if (data.cancelled) {
          toast.warning(`AUCTION CANCELLED: ${data.snippet.title}`);
        } else {
          toast.success(`AUCTION WON: ${data.winner?.name} acquired fragment for ${data.winningBid} CR`, {
            style: { border: '1px solid #00FA9A', color: '#00FA9A' }
          });
        }
        setAuctionState({ active: false, auction: null });
        setHistory([]);
      });

      socket.on('auction:new-bid', (data) => {
        setAuctionState(prev => {
          if (!prev.auction) return prev;
          return {
            ...prev,
            auction: {
              ...prev.auction,
              highestBid: {
                id: data.bidId,
                amount: data.amount,
                team: { id: data.teamId, name: data.teamName },
                createdAt: data.timestamp,
              },
              totalBids: prev.auction.totalBids + 1,
              inactivityDeadline: data.inactivityDeadline,
            }
          };
        });
        
        // Reset inactivity countdown to 15s on each new bid
        setInactivityTimeLeft(15);
        
        setHistory(prev => [{
            id: data.bidId,
            amount: data.amount,
            team: { id: data.teamId, name: data.teamName },
            createdAt: data.timestamp,
          }, ...prev]);
      });

      return () => {
        socket.off('auction:started');
        socket.off('auction:ended');
        socket.off('auction:new-bid');
      };
    }
  }, [isConnected, socket, joinAuctionRoom, fetchActiveAuction]);

  // Local timer for smooth countdown
  useEffect(() => {
    if (!auctionState.active || !auctionState.auction || auctionState.auction.timeLeft <= 0) return;

    const interval = setInterval(() => {
      setAuctionState(prev => {
        if (!prev.active || !prev.auction || prev.auction.timeLeft <= 0) return prev;
        
        // Recalculate accurately based on endTime to prevent drift
        const now = Date.now();
        const endTimeStr = prev.auction.endTime;
        if (!endTimeStr) return prev;
        
        const endTime = new Date(endTimeStr).getTime();
        const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
        
        return {
          ...prev,
          auction: {
            ...prev.auction,
            timeLeft
          }
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [auctionState.active]);

  // Inactivity countdown timer (15s after each bid)
  useEffect(() => {
    if (inactivityTimeLeft === null || inactivityTimeLeft <= 0) return;

    const interval = setInterval(() => {
      setInactivityTimeLeft(prev => {
        if (prev === null || prev <= 0) return null;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [inactivityTimeLeft]);

  // Reset inactivity when auction ends
  useEffect(() => {
    if (!auctionState.active) {
      setInactivityTimeLeft(null);
    }
  }, [auctionState.active]);

  const placeBid = async (amount: number) => {
    try {
      const res = await fetchWithAuth('/auction/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || 'Bid rejected');
        return false;
      }
      
      toast.success('Bid accepted and broadcasted.');
      
      // Update local team credits in localStorage
      const teamStr = localStorage.getItem('team');
      if (teamStr) {
        try {
          const team = JSON.parse(teamStr);
          team.credits = data.newBalance;
          localStorage.setItem('team', JSON.stringify(team));
        } catch (e) {}
      }
      
      return true;
    } catch (error) {
      toast.error('Uplink failed. Network error.');
      return false;
    }
  };

  return {
    ...auctionState,
    history,
    isLoading,
    inactivityTimeLeft,
    placeBid,
  };
}
