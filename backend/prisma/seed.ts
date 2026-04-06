import { PrismaClient } from './generated-client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const teamPassword = await bcrypt.hash('team123', 10);
  
  // 1. Create Admins
  const admins = [
    { name: 'Aegis Command', key: 'AEGIS_ADMIN', pass: 'admin123' },
    { name: 'Root Override', key: 'admin', pass: 'admin123' },
  ];

  for (const a of admins) {
    const pass = await bcrypt.hash(a.pass, 10);
    await prisma.team.upsert({
      where: { name: a.name }, // Use name as the stable unique identifier in seed
      update: {
        accessKey: a.key,
        password: pass,
        role: 'ADMIN',
      },
      create: {
        name: a.name,
        accessKey: a.key,
        password: pass,
        role: 'ADMIN',
        credits: 99999,
      },
    });
  }

  // 2. Create 3 Test Teams
  const teams = [
    { name: 'Phantom Unit', key: 'PHANTOM_77' },
    { name: 'Zero Day', key: 'ZERO_DAY_01' },
    { name: 'Ghost Protocol', key: 'GHOST_PROTO' },
    { name: 'User Player', key: 'user' },
  ];

  for (const t of teams) {
    await prisma.team.upsert({
      where: { name: t.name }, // Use name as the stable unique identifier in seed
      update: {
        accessKey: t.key,
        password: t.key === 'user' ? await bcrypt.hash('password', 10) : teamPassword,
      },
      create: {
        name: t.name,
        accessKey: t.key,
        password: t.key === 'user' ? await bcrypt.hash('password', 10) : teamPassword,
        credits: 1000,
        members: {
          create: [{ name: 'Operator 1' }, { name: 'Operator 2' }, { name: 'Operator 3' }, { name: 'Operator 4' }],
        },
      },
    });
  }

  // 3. Create Sample Snippets across all categories
  const snippets = [
    {
      title: 'Buffer Overflow Vulnerability',
      category: 'C' as const,
      buggyCode: `#include <stdio.h>
#include <string.h>

void hack(char *input) {
  char buffer[64];
  // [EDITABLE ZONE START]
  strcpy(buffer, input);
  // [EDITABLE ZONE END]
}

int main() {
  char payload[256];
  scanf("%s", payload);
  hack(payload);
  return 0;
}`,
      solution: `#include <stdio.h>
#include <string.h>

void hack(char *input) {
  char buffer[64];
  // [EDITABLE ZONE START]
  strncpy(buffer, input, sizeof(buffer) - 1);
  buffer[sizeof(buffer) - 1] = '\\0';
  // [EDITABLE ZONE END]
}

int main() {
  char payload[256];
  scanf("%s", payload);
  hack(payload);
  return 0;
}`,
      order: 1,
    },
    {
      title: 'SQL Injection Shield',
      category: 'WEB' as const,
      buggyCode: `const express = require('express');
const db = require('./db');

app.get('/user', (req, res) => {
  const userId = req.query.id;
  // [EDITABLE ZONE START]
  const query = "SELECT * FROM users WHERE id = " + userId;
  db.query(query, (err, result) => {
  // [EDITABLE ZONE END]
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});`,
      solution: `const express = require('express');
const db = require('./db');

app.get('/user', (req, res) => {
  const userId = req.query.id;
  // [EDITABLE ZONE START]
  const query = "SELECT * FROM users WHERE id = $1";
  db.query(query, [userId], (err, result) => {
  // [EDITABLE ZONE END]
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});`,
      order: 2,
    },
    {
      title: 'Binary Search Fix',
      category: 'CP' as const,
      buggyCode: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        # [EDITABLE ZONE START]
        mid = (left + right) / 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid
        else:
            right = mid
        # [EDITABLE ZONE END]
    return -1`,
      solution: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        # [EDITABLE ZONE START]
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
        # [EDITABLE ZONE END]
    return -1`,
      order: 3,
    },
    {
      title: 'Memory Leak Hunter',
      category: 'PYTHON' as const,
      buggyCode: `class DataProcessor:
    _instances = []
    
    def __init__(self, data):
        self.data = data
        # [EDITABLE ZONE START]
        DataProcessor._instances.append(self)
        self.processed = self._process()
        # [EDITABLE ZONE END]
    
    def _process(self):
        return [x * 2 for x in self.data]
    
    def get_result(self):
        return self.processed`,
      solution: `class DataProcessor:
    _instances = []
    
    def __init__(self, data):
        self.data = data
        # [EDITABLE ZONE START]
        import weakref
        DataProcessor._instances.append(weakref.ref(self))
        self.processed = self._process()
        # [EDITABLE ZONE END]
    
    def _process(self):
        return [x * 2 for x in self.data]
    
    def get_result(self):
        return self.processed`,
      order: 4,
    },
    {
      title: 'Race Condition Deadlock',
      category: 'C' as const,
      buggyCode: `#include <pthread.h>
#include <stdio.h>

pthread_mutex_t lock1 = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_t lock2 = PTHREAD_MUTEX_INITIALIZER;
int shared_data = 0;

void* thread_func(void* arg) {
    int id = *(int*)arg;
    // [EDITABLE ZONE START]
    if (id == 0) {
        pthread_mutex_lock(&lock1);
        pthread_mutex_lock(&lock2);
    } else {
        pthread_mutex_lock(&lock2);
        pthread_mutex_lock(&lock1);
    }
    // [EDITABLE ZONE END]
    shared_data++;
    printf("Thread %d: %d\\n", id, shared_data);
    pthread_mutex_unlock(&lock2);
    pthread_mutex_unlock(&lock1);
    return NULL;
}`,
      solution: `#include <pthread.h>
#include <stdio.h>

pthread_mutex_t lock1 = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_t lock2 = PTHREAD_MUTEX_INITIALIZER;
int shared_data = 0;

void* thread_func(void* arg) {
    int id = *(int*)arg;
    // [EDITABLE ZONE START]
    pthread_mutex_lock(&lock1);
    pthread_mutex_lock(&lock2);
    // [EDITABLE ZONE END]
    shared_data++;
    printf("Thread %d: %d\\n", id, shared_data);
    pthread_mutex_unlock(&lock2);
    pthread_mutex_unlock(&lock1);
    return NULL;
}`,
      order: 5,
    },
    {
      title: 'XSS Payload Sanitizer',
      category: 'WEB' as const,
      buggyCode: `function renderComment(comment) {
  const container = document.getElementById('comments');
  // [EDITABLE ZONE START]
  container.innerHTML += '<div class="comment">' + comment.text + '</div>';
  // [EDITABLE ZONE END]
}`,
      solution: `function renderComment(comment) {
  const container = document.getElementById('comments');
  // [EDITABLE ZONE START]
  const div = document.createElement('div');
  div.className = 'comment';
  div.textContent = comment.text;
  container.appendChild(div);
  // [EDITABLE ZONE END]
}`,
      order: 6,
    },
  ];

  for (const s of snippets) {
    await prisma.snippet.upsert({
      where: { title: s.title },
      update: {},
      create: s,
    });
  }

  // 4. Initialize System State
  await prisma.systemState.upsert({
    where: { id: 'CURRENT_STATE' },
    update: {},
    create: {
      id: 'CURRENT_STATE',
      currentPhase: 'AUCTION',
    },
  });

  console.log('✅ Seeding complete.');
  console.log(`   - ${admins.length} admins created`);
  console.log(`   - ${teams.length} teams created`);
  console.log(`   - ${snippets.length} snippets created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });