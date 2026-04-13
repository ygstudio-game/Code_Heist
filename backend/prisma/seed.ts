import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 3. Clear existing data
  await prisma.submission.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.auctionRound.deleteMany();
  await prisma.snippet.deleteMany();
  await prisma.creditLog.deleteMany();
  await prisma.member.deleteMany();
  await prisma.team.deleteMany();
  await prisma.systemState.deleteMany();
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



  const snippets = [
    // --- EASY QUESTIONS ---
    {
      title: 'C Syntax: Simple Sum',
      category: 'C',
      buggyCode: `#include <stdio.h>

int main() {
    int a = 10
    int b = 20;

    printf("Sum is %d", a + b)

    return 0;
}`,
      solution: `#include <stdio.h>

int main() {
    int a = 10;
    int b = 20;

    printf("Sum is %d", a + b);

    return 0;
}`,
      expected: 'Sum is 30',
      order: 1,
    },
    {
      title: 'C Logic: Semicolon Trap',
      category: 'C',
      buggyCode: `#include <stdio.h>

int main() {
    int i;

    for(i = 1; i <= 5; i++);
    {
        printf("%d ", i);
    }

    return 0;
}`,
      solution: `#include <stdio.h>

int main() {
    int i;

    for(i = 1; i <= 5; i++)
    {
        printf("%d ", i);
    }

    return 0;
}`,
      expected: '1 2 3 4 5',
      order: 2,
    },
    {
      title: 'CPP Syntax: Value Print',
      category: 'CPP',
      buggyCode: `#include <iostream>
using namespace std;

int main() {
    int x = 5
    cout << "Value of x is " << x << endl
    return 0;
}`,
      solution: `#include <iostream>
using namespace std;

int main() {
    int x = 5;
    cout << "Value of x is " << x << endl;
    return 0;
}`,
      expected: 'Value of x is 5',
      order: 3,
    },
    {
      title: 'CPP Logic: Inclusive Sum',
      category: 'CPP',
      buggyCode: `#include <iostream>
using namespace std;

int main() {
    int n = 5;
    int sum = 0;

    for(int i = 1; i < n; i++) {
        sum += i;
    }

    cout << sum;
    return 0;
}`,
      solution: `#include <iostream>
using namespace std;

int main() {
    int n = 5;
    int sum = 0;

    for(int i = 1; i <= n; i++) {
        sum += i;
    }

    cout << sum;
    return 0;
}`,
      expected: '15',
      order: 4,
    },
    {
      title: 'CPP Syntax: Array Bounds',
      category: 'CPP',
      buggyCode: `#include <iostream>
using namespace std;

int main() {
    int arr[3] = {1, 2, 3};

    for(int i = 0; i <= 3; i++) {
        cout << arr[i] << " ";
    }

    return 0;
}`,
      solution: `#include <iostream>
using namespace std;

int main() {
    int arr[3] = {1, 2, 3};

    for(int i = 0; i < 3; i++) {
        cout << arr[i] << " ";
    }

    return 0;
}`,
      expected: '1 2 3',
      order: 5,
    },
    {
      title: 'Python Syntax: Condition Check',
      category: 'PYTHON',
      buggyCode: `a = 10
b = 20

if a < b
    print("a is smaller")`,
      solution: `a = 10
b = 20

if a < b:
    print("a is smaller")`,
      expected: 'a is smaller',
      order: 6,
    },
    {
      title: 'Python Logic: Factorial Init',
      category: 'PYTHON',
      buggyCode: `n = 5
fact = 0

for i in range(1, n+1):
    fact = fact * i

print(fact)`,
      solution: `n = 5
fact = 1

for i in range(1, n+1):
    fact = fact * i

print(fact)`,
      expected: '120',
      order: 7,
    },
    // --- MEDIUM QUESTIONS ---
    {
      title: 'C Syntax: Comparison Fork',
      category: 'C',
      buggyCode: `#include<stdio.h>

int main() {
  int a = 10, b = 20
  if(a > b)
      printf("A is greater");
  else
      printf("B is greater");
  return 0;
}`,
      solution: `#include<stdio.h>

int main() {
  int a = 10, b = 20;
  if(a > b)
      printf("A is greater");
  else
      printf("B is greater");
  return 0;
}`,
      expected: 'B is greater',
      order: 8,
    },
    {
      title: 'C Logic: Accumulator Loop',
      category: 'C',
      buggyCode: `#include<stdio.h>

int main() {
  int i, sum = 0;
  for(i = 1; i <= 5; i++); {
      sum += i;
  }
  printf("%d", sum);
  return 0;
}`,
      solution: `#include<stdio.h>

int main() {
  int i, sum = 0;
  for(i = 1; i <= 5; i++) {
      sum += i;
  }
  printf("%d", sum);
  return 0;
}`,
      expected: '15',
      order: 9,
    },
    {
      title: 'CPP Syntax: Output Missing',
      category: 'CPP',
      buggyCode: `#include<iostream>
using namespace std;

int main() {
  int x = 5;
  cout << "Value is: " << x
  return 0;
}`,
      solution: `#include<iostream>
using namespace std;

int main() {
  int x = 5;
  cout << "Value is: " << x;
  return 0;
}`,
      expected: 'Value is: 5',
      order: 10,
    },
    {
      title: 'CPP Logic: Max Element Init',
      category: 'CPP',
      buggyCode: `#include<iostream>
#include<vector>
#include<algorithm>
using namespace std;

int main() {
    int arr[] = {-10, -20, -3};
    int n = 3;

    int max_val = 0;
    for(int i = 0; i < n; i++) {
       if(arr[i] > max_val)
           max_val = arr[i];
    }
    cout << max_val;
    return 0;
}`,
      solution: `#include<iostream>
#include<vector>
#include<algorithm>
using namespace std;

int main() {
    int arr[] = {-10, -20, -3};
    int n = 3;

    int max_val = arr[0];
    for(int i = 1; i < n; i++) {
       if(arr[i] > max_val)
           max_val = arr[i];
    }
    cout << max_val;
    return 0;
}`,
      expected: '-3',
      order: 11,
    },
    {
      title: 'CPP Logic: Vector Bounds',
      category: 'CPP',
      buggyCode: `#include<iostream>
#include<vector>
using namespace std;

int main() {
    vector<int> v = {1,2,3};

    for(int i = 0; i <= v.size(); i++) {
       cout << v[i] << " ";
    }
    return 0;
}`,
      solution: `#include<iostream>
#include<vector>
using namespace std;

int main() {
    vector<int> v = {1,2,3};

    for(int i = 0; i < v.size(); i++) {
       cout << v[i] << " ";
    }
    return 0;
}`,
      expected: '1 2 3',
      order: 12,
    },
    {
      title: 'Python Syntax: Function Def',
      category: 'PYTHON',
      buggyCode: `def check_even(n)
  if n % 2 == 0:
      print("Even")
  else:
      print("Odd")

check_even(5)`,
      solution: `def check_even(n):
  if n % 2 == 0:
      print("Even")
  else:
      print("Odd")

check_even(5)`,
      expected: 'Odd',
      order: 13,
    },
    {
      title: 'Python Logic: Shadowing Max',
      category: 'PYTHON',
      buggyCode: `def find_max(arr):
  max = arr[0]
  for i in range(len(arr)):
      if arr[i] > max:
          max = arr[i]
  return max

print(find_max([-10, -20, -3, -50]))`,
      solution: `def find_max(arr):
  max_val = arr[0]
  for i in range(1, len(arr)):
      if arr[i] > max_val:
          max_val = arr[i]
  return max_val

print(find_max([-10, -20, -3, -50]))`,
      expected: '-3',
      order: 14,
    },
    // --- WEB QUESTIONS ---
    {
      title: 'The Phantom Counter',
      category: 'WEB',
      buggyCode: `let count = 0;
document.getElementById('btn').onclick = function() {
   let count = count + 1; // Bug: shadowed variable and NaN error
   document.getElementById('display').innerText = count;
};`,
      solution: `let count = 0;
document.getElementById('btn').onclick = function() {
   count = count + 1; 
   document.getElementById('display').innerText = count;
};`,
      expected: '/count\\s*=\\s*count|count\\+\\+/',
      order: 15,
    },
    {
      title: 'The Invisible Alert',
      category: 'WEB',
      buggyCode: `function validate() {
   const val = document.querySelector('input').value;
   if(!val) {
      document.getElementById('error-msg').style.visibility = 'hidden'; 
   }
}`,
      solution: `function validate() {
   const val = document.querySelector('input').value;
   if(!val) {
      document.getElementById('error-msg').style.display = 'block'; 
   }
}`,
      expected: '/style\\.display\\s*=\\s*[\'"]block[\'"]/',
      order: 16,
    },
    {
      title: 'The Leaking Form',
      category: 'WEB',
      buggyCode: `document.querySelector('form').addEventListener('submit', (e) => {
   const query = document.getElementById('search').value;
   fetchResults(query); 
});`,
      solution: `document.querySelector('form').addEventListener('submit', (e) => {
   e.preventDefault();
   const query = document.getElementById('search').value;
   fetchResults(query); 
});`,
      expected: '/preventDefault\\(\\)/',
      order: 17,
    },
    {
      title: 'The Array Multiplier',
      category: 'WEB',
      buggyCode: `function doubleArray(arr) {
   arr.forEach(num => {
      return num * 2; // Bug: forEach returns undefined
   });
}`,
      solution: `function doubleArray(arr) {
   return arr.map(num => num * 2);
}`,
      expected: '/return\\s+arr\\.map/',
      order: 18,
    },
    {
      title: 'The Broken Navigation',
      category: 'WEB',
      buggyCode: `const nav = document.querySelector('.nav-links');
document.querySelector('.menu-icon').onclick = () => {
   nav.classList = 'active'; // Bug: overwrites all classes
};`,
      solution: `const nav = document.querySelector('.nav-links');
document.querySelector('.menu-icon').onclick = () => {
   nav.classList.toggle('active');
};`,
      expected: '/classList\\.toggle|classList\\.add/',
      order: 19,
    },
    {
      title: 'The Race Condition Fetch',
      category: 'WEB',
      buggyCode: `async function loadData() {
   const data = fetch('https://api.heist.com/v1/targets'); 
   document.getElementById('list').innerHTML = data.name;
}`,
      solution: `async function loadData() {
   const response = await fetch('https://api.heist.com/v1/targets'); 
   const data = await response.json();
   document.getElementById('list').innerHTML = data.name;
}`,
      expected: '/await\\s+fetch.*await.*\\.json\\(\\)/s',
      order: 20,
    },
    {
      title: 'The Z-Index Nightmare',
      category: 'WEB',
      buggyCode: `.overlay { z-index: 10; position: fixed; }
.modal { 
   z-index: 5; 
   position: absolute; 
}`,
      solution: `.overlay { z-index: 10; position: fixed; }
.modal { 
   z-index: 11; 
   position: absolute; 
}`,
      expected: '/z-index:\\s*1[1-9]/',
      order: 21,
    },
  ];

  for (const s of snippets) {
    await prisma.snippet.upsert({
      where: { title: s.title },
      update: {
        category: s.category as any,
        buggyCode: s.buggyCode,
        solution: s.solution,
        expected: s.expected,
        order: s.order,
      },
      create: {
        title: s.title,
        category: s.category as any,
        buggyCode: s.buggyCode,
        solution: s.solution,
        expected: s.expected,
        order: s.order,
      },
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