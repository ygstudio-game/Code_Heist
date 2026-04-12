import { PrismaClient } from './generated-client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
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
  char buffer[10];
  // [EDITABLE ZONE START]
  strncpy(buffer, input, sizeof(buffer) - 1);
  buffer[sizeof(buffer) - 1] = '\\0';
  // [EDITABLE ZONE END]
}

int main() {
  char payload[100];
  if (scanf("%99s", payload) == 1) {
    hack(payload);
    printf("BUFFER_SAFE_OP");
  }
  return 0;
}`,
      hiddenInput: 'VeryLongPayloadThatMightOverflowIfUsingStrcpy',
      expected: 'BUFFER_SAFE_OP',
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
      expected: '/\\$1|query,\\s*\\[userId\\]/',
      order: 2,
    },
    {
      title: 'Binary Search Fix',
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
    return -1

if __name__ == "__main__":
    import sys
    data = sys.stdin.read().split()
    if data:
        n = int(data[0])
        target = int(data[1])
        arr = [int(x) for x in data[2:]]
        print(binary_search(arr, target))`,
      category: 'PYTHON' as const,
      hiddenInput: '5 3\n1 2 3 4 5',
      expected: '2',
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
        return self.processed

if __name__ == "__main__":
    dp = DataProcessor([1, 2, 3])
    print("OBJECT_INITIALIZED")`,
      expected: 'OBJECT_INITIALIZED',
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
    pthread_mutex_unlock(&lock2);
    pthread_mutex_unlock(&lock1);
    return NULL;
}

int main() {
    pthread_t t1, t2;
    int id1 = 0, id2 = 1;
    pthread_create(&t1, NULL, thread_func, &id1);
    pthread_create(&t2, NULL, thread_func, &id2);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    printf("THREADS_COMPLETED_SAFELY");
    return 0;
}`,
      expected: 'THREADS_COMPLETED_SAFELY',
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
      expected: '/textContent|createElement/',
      order: 6,
    },
    {
      title: 'The Phantom Counter',
      category: 'WEB' as const,
      buggyCode: `let count = 0;
document.getElementById('btn').onclick = function() {
   // [EDITABLE ZONE START]
   let count = count + 1; // Bug: shadowed variable and NaN error
   // [EDITABLE ZONE END]
   document.getElementById('display').innerText = count;
};`,
      solution: `let count = 0;
document.getElementById('btn').onclick = function() {
   // [EDITABLE ZONE START]
   count = count + 1; 
   // [EDITABLE ZONE END]
   document.getElementById('display').innerText = count;
};`,
      expected: '/(count\\s*=\\s*count\\s*\\+\\s*1|count\\+\\+)/',
      order: 7,
    },
    {
      title: 'The Invisible Alert',
      category: 'WEB' as const,
      buggyCode: `function validate() {
   const val = document.querySelector('input').value;
   if(!val) {
      // [EDITABLE ZONE START]
      document.getElementById('error-msg').style.visibility = 'hidden'; 
      // [EDITABLE ZONE END]
   }
}`,
      solution: `function validate() {
   const val = document.querySelector('input').value;
   if(!val) {
      // [EDITABLE ZONE START]
      document.getElementById('error-msg').style.visibility = 'visible'; 
      // [EDITABLE ZONE END]
   }
}`,
      expected: '/(style\\.visibility\\s*=\\s*[\'"]visible[\'"]|style\\.display\\s*=\\s*[\'"]block[\'"])/',
      order: 8,
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