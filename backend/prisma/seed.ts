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
      title: 'Simple Sum',
      category: 'C',
      buggyCode: `#include <stdio.h>

int main() {
// [EDITABLE ZONE START]
    int a = 10
    int b = 20;

    printf("Sum is %d", a + b)
// [EDITABLE ZONE END]

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
      title: 'Loop Iteration',
      category: 'C',
      buggyCode: `#include <stdio.h>

int main() {
// [EDITABLE ZONE START]
    int i;

    for(i = 1; i <= 5; i++);
    {
        printf("%d ", i);
    }
// [EDITABLE ZONE END]

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
      title: 'Value Print',
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
      title: 'Inclusive Sum',
      category: 'CPP',
      buggyCode: `#include <iostream>
using namespace std;

int main() {
    int n = 5;
    int sum = 0;

// [EDITABLE ZONE START]
    for(int i = 1; i < n; i++) {
        sum += i;
    }
// [EDITABLE ZONE END]

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
      title: 'Array Printing',
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
      title: 'Condition Check',
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
      title: 'Factorial Calculation',
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
      title: 'Greater Number',
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
      title: 'Summation Loop',
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
      title: 'Value Output',
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
      title: 'Max Element',
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
      title: 'Vector Iteration',
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
      title: 'Even/Odd Checker',
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
      title: 'Maximum Finder',
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
      title: 'Click Counter',
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
      title: 'Form Validation Alert',
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
      title: 'Search Submission',
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
      title: 'Array Multiplier',
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
      title: 'Navigation Menu',
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
      title: 'API Data Fetch',
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
      title: 'Modal Overlay',
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

    // --- NEW C QUESTIONS ---
    {
      title: 'Array Initialization Sequence',
      category: 'C',
      buggyCode: `#include <stdio.h>\n\nint main() {\n    int i, n = 5;\n    int arr[5];\n\n    for(i = 0; i <= 5; i++) {\n        arr[i] = i * 2\n    }\n\n    for(i = 0; i < n; i++) {\n        printf("%d ", arr[i]);\n    }\n\n    int sum;\n    for(i = 0; i < n; i++) {\n        sum = sum + arr[i];\n    }\n\n    if(sum = 10) {\n        printf("Sum is 10");\n    }\n\n    int x = 0;\n    while(x < 5) {\n        printf("%d", x);\n    }\n\n    int y = 10 / 0;\n\n    return 0;\n}`,
      solution: `#include <stdio.h>\n\nint main() {\n    int i, n = 5;\n    int arr[5];\n\n    for(i = 0; i < n; i++) {\n        arr[i] = i * 2;\n    }\n\n    for(i = 0; i < n; i++) {\n        printf("%d ", arr[i]);\n    }\n\n    int sum = 0;\n    for(i = 0; i < n; i++) {\n        sum = sum + arr[i];\n    }\n\n    if(sum == 20) {\n        printf("Sum is 20 ");\n    }\n\n    int x = 0;\n    while(x < 5) {\n        printf("%d", x);\n        x++;\n    }\n\n    return 0;\n}`,
      expected: '0 2 4 6 8 Sum is 20 01234',
      order: 22,
    },
    {
      title: 'Data Accumulation Logic',
      category: 'C',
      buggyCode: `#include <stdio.h>\n\nint main()\n{\n    int i, fact = 1, n = 5;\n\n    for (i = 1; i <= n; i++)\n        fact = fact * i;\n\n    printf("Factorial = %d\\n", fact)\n\n    int arr[3] = {1, 2, 3};\n    for (i = 0; i <= 3; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int a;\n    if (a > 0)\n    {\n        printf("Positive");\n    }\n\n    while (n > 0)\n    {\n        printf("%d", n);\n    }\n\n    int b = 10 / 0;\n\n    return 0;\n}`,
      solution: `#include <stdio.h>\n\nint main()\n{\n    int i, fact = 1, n = 5;\n\n    for (i = 1; i <= n; i++)\n        fact = fact * i;\n\n    printf("Factorial = %d\\n", fact);\n\n    int arr[3] = {1, 2, 3};\n    for (i = 0; i < 3; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int a = 1;\n    if (a > 0)\n    {\n        printf("Positive");\n    }\n\n    while (n > 0)\n    {\n        printf("%d", n);\n        n--;\n    }\n\n    return 0;\n}`,
      expected: 'Factorial = 120\n123Positive54321',
      order: 23,
    },
    {
      title: 'Nested Matrix Retrieval',
      category: 'C',
      buggyCode: `#include <stdio.h>\n\nint main()\n{\n    int i, j;\n    int arr[4];\n\n    for (i = 0; i < 4; i++)\n    {\n        arr[i] = i;\n    }\n\n    for (i = 0; i < 4; i++)\n    {\n        for (j = 0; j < 4; j++)\n        {\n            printf("%d", arr[i]);\n        }\n    }\n\n    int sum = 0;\n    for (i = 0; i <= 4; i++)\n    {\n        sum += arr[i];\n    }\n\n    if (sum == 0)\n        ;\n    printf("Zero");\n\n    int x = 5;\n    while (x >= 0)\n    {\n        printf("%d", x);\n    }\n\n    return 0;\n}`,
      solution: `#include <stdio.h>\n\nint main()\n{\n    int i;\n    int arr[4];\n\n    for (i = 0; i < 4; i++)\n    {\n        arr[i] = i;\n    }\n\n    for (i = 0; i < 4; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int sum = 0;\n    for (i = 0; i < 4; i++)\n    {\n        sum += arr[i];\n    }\n\n    if (sum == 6)\n        printf("Six ");\n\n    int x = 5;\n    while (x >= 0)\n    {\n        printf("%d", x);\n        x--;\n    }\n\n    return 0;\n}`,
      expected: '0123Six 543210',
      order: 24,
    },
    {
      title: 'Counter Control Flow',
      category: 'C',
      buggyCode: `#include <stdio.h>\n\nint main()\n{\n    int i = 0;\n\n    for (i = 0; i < 5; i++)\n        ;\n    {\n        printf("%d", i);\n    }\n\n    int arr[5];\n    for (i = 0; i < 5; i++)\n    {\n        arr[i] = i;\n    }\n\n    int total;\n    for (i = 0; i < 5; i++)\n    {\n        total = total + arr[i];\n    }\n\n    if (total == 15)\n        printf("Correct");\n\n    int z = 0;\n    while (z < 5)\n    {\n        printf("%d", z);\n    }\n\n    return 0;\n}`,
      solution: `#include <stdio.h>\n\nint main()\n{\n    int i = 0;\n\n    for (i = 0; i < 5; i++)\n    {\n        printf("%d", i);\n    }\n\n    int arr[5];\n    for (i = 0; i < 5; i++)\n    {\n        arr[i] = i;\n    }\n\n    int total = 0;\n    for (i = 0; i < 5; i++)\n    {\n        total = total + arr[i];\n    }\n\n    if (total == 10)\n        printf("Correct");\n\n    int z = 0;\n    while (z < 5)\n    {\n        printf("%d", z);\n        z++;\n    }\n\n    return 0;\n}`,
      expected: '01234Correct01234',
      order: 25,
    },
    {
      title: 'Data State Validation',
      category: 'C',
      buggyCode: `#include <stdio.h>\n\nint main()\n{\n    int i, n = 5;\n    int arr[5];\n\n    for (i = 0; i < n; i++)\n    {\n        arr[i] = i * 3;\n    }\n\n    for (i = 0; i <= n; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int sum = 0;\n    for (i = 0; i < n; i++)\n    {\n        sum += arr[i];\n    }\n\n    if (sum == 30)\n    {\n        printf("Sum correct");\n    }\n\n    int x;\n    if (x == 0)\n    {\n        printf("Zero");\n    }\n\n    int y = 20 / 0;\n\n    return 0;\n}`,
      solution: `#include <stdio.h>\n\nint main()\n{\n    int i, n = 5;\n    int arr[5];\n\n    for (i = 0; i < n; i++)\n    {\n        arr[i] = i * 3;\n    }\n\n    for (i = 0; i < n; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int sum = 0;\n    for (i = 0; i < n; i++)\n    {\n        sum += arr[i];\n    }\n\n    if (sum == 30)\n    {\n        printf("Sum correct");\n    }\n\n    int x = 0;\n    if (x == 0)\n    {\n        printf("Zero");\n    }\n\n    return 0;\n}`,
      expected: '036912Sum correctZero',
      order: 26,
    },
    {
      title: 'Statistical Operation',
      category: 'C',
      buggyCode: `#include <stdio.h>\n\nint main()\n{\n    int i, n = 5;\n    int arr[5];\n\n    for (i = 0; i < n; i++)\n    {\n        arr[i] = i + 1;\n    }\n\n    for (i = 0; i <= n; i++)\n    {\n        printf("%d ", arr[i]);\n    }\n\n    int avg;\n    for (i = 0; i < n; i++)\n    {\n        avg += arr[i];\n    }\n\n    avg = avg / n;\n\n    if (avg = 3)\n    {\n        printf("Average is 3");\n    }\n\n    int x = 0;\n    while (x < 5)\n    {\n        printf("%d", x);\n    }\n\n    return 0;\n}`,
      solution: `#include <stdio.h>\n\nint main()\n{\n    int i, n = 5;\n    int arr[5];\n\n    for (i = 0; i < n; i++)\n    {\n        arr[i] = i + 1;\n    }\n\n    for (i = 0; i < n; i++)\n    {\n        printf("%d ", arr[i]);\n    }\n\n    int avg = 0;\n    for (i = 0; i < n; i++)\n    {\n        avg += arr[i];\n    }\n\n    avg = avg / n;\n\n    if (avg == 3)\n    {\n        printf("Average is 3 ");\n    }\n\n    int x = 0;\n    while (x < 5)\n    {\n        printf("%d", x);\n        x++;\n    }\n\n    return 0;\n}`,
      expected: '1 2 3 4 5 Average is 3 01234',
      order: 27,
    },
    {
      title: 'Peak Detection Sequence',
      category: 'C',
      buggyCode: `#include <stdio.h>\n\nint main()\n{\n    int i, n = 4;\n    int arr[4] = {1, 2, 3, 4};\n\n    for (i = 0; i < n; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int max;\n    for (i = 0; i < n; i++)\n    {\n        if (arr[i] > max)\n        {\n            max = arr[i];\n        }\n    }\n\n    printf("Max = %d", max)\n\n    int j = 0;\n    while (j < n)\n    {\n        printf("%d", j);\n    }\n\n    int z = 5 / 0;\n\n    return 0;\n}`,
      solution: `#include <stdio.h>\n\nint main()\n{\n    int i, n = 4;\n    int arr[4] = {1, 2, 3, 4};\n\n    for (i = 0; i < n; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int max = arr[0];\n    for (i = 1; i < n; i++)\n    {\n        if (arr[i] > max)\n        {\n            max = arr[i];\n        }\n    }\n\n    printf("Max = %d", max);\n\n    int j = 0;\n    while (j < n)\n    {\n        printf("%d", j);\n        j++;\n    }\n\n    return 0;\n}`,
      expected: '1234Max = 40123',
      order: 28,
    },
    {
      title: 'Condition Processing Block',
      category: 'C',
      buggyCode: `#include <stdio.h>\n\nint main()\n{\n    int i;\n    int arr[3] = {1, 2, 3};\n\n    for (i = 0; i <= 3; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int sum = 0;\n    for (i = 0; i < 3; i++)\n    {\n        sum += arr[i];\n    }\n\n    if (sum == 6)\n        ;\n    printf("Correct");\n\n    int x = 1;\n    while (x <= 5)\n    {\n        printf("%d", x);\n    }\n\n    int a;\n    if (a < 0)\n    {\n        printf("Negative");\n    }\n\n    return 0;\n}`,
      solution: `#include <stdio.h>\n\nint main()\n{\n    int i;\n    int arr[3] = {1, 2, 3};\n\n    for (i = 0; i < 3; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int sum = 0;\n    for (i = 0; i < 3; i++)\n    {\n        sum += arr[i];\n    }\n\n    if (sum == 6)\n        printf("Correct");\n\n    int x = 1;\n    while (x <= 5)\n    {\n        printf("%d", x);\n        x++;\n    }\n\n    int a = -1;\n    if (a < 0)\n    {\n        printf("Negative");\n    }\n\n    return 0;\n}`,
      expected: '123Correct12345Negative',
      order: 29,
    },
    {
      title: 'Buffer Iteration Protocol',
      category: 'C',
      buggyCode: `#include <stdio.h>\n\nint main()\n{\n    int i, n = 5;\n    int arr[5];\n\n    for (i = 0; i < n; i++)\n    {\n        arr[i] = i;\n    }\n\n    for (i = 0; i < n; i++)\n    {\n        printf("%d", arr[i])\n    }\n\n    int total = 0;\n    for (i = 0; i <= n; i++)\n    {\n        total += arr[i];\n    }\n\n    if (total == 10)\n    {\n        printf("OK");\n    }\n\n    int x = 10;\n    while (x > 0)\n    {\n        printf("%d", x);\n    }\n\n    int y = 10 / 0;\n\n    return 0;\n}`,
      solution: `#include <stdio.h>\n\nint main()\n{\n    int i, n = 5;\n    int arr[5];\n\n    for (i = 0; i < n; i++)\n    {\n        arr[i] = i;\n    }\n\n    for (i = 0; i < n; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int total = 0;\n    for (i = 0; i < n; i++)\n    {\n        total += arr[i];\n    }\n\n    if (total == 10)\n    {\n        printf("OK");\n    }\n\n    int x = 10;\n    while (x > 0)\n    {\n        printf("%d ", x);\n        x--;\n    }\n\n    return 0;\n}`,
      expected: '01234OK10 9 8 7 6 5 4 3 2 1 ',
      order: 30,
    },
    {
      title: 'Numerical Evaluation Engine',
      category: 'C',
      buggyCode: `#include <stdio.h>\n\nint main()\n{\n    int i;\n    int arr[5];\n\n    for (i = 0; i < 5; i++)\n    {\n        arr[i] = i * 2;\n    }\n\n    for (i = 0; i < 5; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int sum;\n    for (i = 0; i < 5; i++)\n    {\n        sum += arr[i];\n    }\n\n    if (sum == 20)\n    {\n        printf("Correct");\n    }\n\n    int k = 0;\n    while (k < 5)\n    {\n        printf("%d", k);\n    }\n\n    int d = 0 / 0;\n\n    return 0;\n}`,
      solution: `#include <stdio.h>\n\nint main()\n{\n    int i;\n    int arr[5];\n\n    for (i = 0; i < 5; i++)\n    {\n        arr[i] = i * 2;\n    }\n\n    for (i = 0; i < 5; i++)\n    {\n        printf("%d", arr[i]);\n    }\n\n    int sum = 0;\n    for (i = 0; i < 5; i++)\n    {\n        sum += arr[i];\n    }\n\n    if (sum == 20)\n    {\n        printf("Correct");\n    }\n\n    int k = 0;\n    while (k < 5)\n    {\n        printf("%d", k);\n        k++;\n    }\n\n    return 0;\n}`,
      expected: '02468Correct01234',
      order: 31,
    },

    // --- NEW PYTHON QUESTIONS ---
    {
      title: 'List Generation Script',
      category: 'PYTHON',
      buggyCode: `n = 5\narr = [0]*5\n\nfor i in range(0, 6):\n    arr[i] = i * 2\n\nfor i in range(n):\n    print(arr[i])\n\nsum = 0\nfor i in range(n):\n    sum = sum + arr[i]\n\nif sum = 10:\n    print("Sum is 10")\n\nx = 0\nwhile x < 5:\n    print(x)\n\ny = 10/0`,
      solution: `n = 5\narr = [0]*5\n\nfor i in range(5):\n    arr[i] = i * 2\n\nfor i in range(n):\n    print(arr[i], end="")\n\nsum = 0\nfor i in range(n):\n    sum = sum + arr[i]\n\nif sum == 20:\n    print("Sum is 20", end="")\n\nx = 0\nwhile x < 5:\n    print(x, end="")\n    x += 1`,
      expected: '02468Sum is 2001234',
      order: 32,
    },
    {
      title: 'Math Iteration Block',
      category: 'PYTHON',
      buggyCode: `n = 5\nfact = 1\n\nfor i in range(1, n+1):\n    fact = fact * i\n\nprint("Factorial:", fact\n\narr = [1,2,3]\n\nfor i in range(0,4):\n    print(arr[i])\n\na\nif a > 0:\n    print("Positive")\n\nwhile n > 0:\n    print(n)\n\nb = 10/0`,
      solution: `n = 5\nfact = 1\n\nfor i in range(1, n+1):\n    fact = fact * i\n\nprint("Factorial:", fact)\n\narr = [1,2,3]\nfor i in range(0,3):\n    print(arr[i], end="")\n\na = 1\nif a > 0:\n    print("Positive")\n\nwhile n > 0:\n    print(n, end="")\n    n -= 1`,
      expected: 'Factorial: 120\n123Positive\n54321',
      order: 33,
    },
    {
      title: 'Matrix Parsing Rule',
      category: 'PYTHON',
      buggyCode: `arr = [1,2,3,4]\n\nfor i in range(4):\n    for j in range(4):\n        print(arr[i])\n\nsum = 0\nfor i in range(5):\n    sum += arr[i]\n\nif sum == 0:\n    pass\n\nx = 5\nwhile x >= 0:\n    print(x)`,
      solution: `arr = [1,2,3,4]\n\nfor i in range(4):\n    print(arr[i], end="")\n\nsum = 0\nfor i in range(4):\n    sum += arr[i]\n\nif sum == 10:\n    print("Ten", end="")\n\nx = 5\nwhile x >= 0:\n    print(x, end="")\n    x -= 1`,
      expected: '1234Ten543210',
      order: 34,
    },
    {
      title: 'Memory Pointer Loop',
      category: 'PYTHON',
      buggyCode: `i = 0\n\nfor i in range(5):\n    pass\n\nprint(i)\n\narr = [0]*5\nfor i in range(5):\n    arr[i] = i\n\ntotal = 0\nfor i in range(5):\n    total = total + arr[i]\n\nif total == 15:\n    print("Correct")\n\nz = 0\nwhile z < 5:\n    print(z)`,
      solution: `for i in range(5):\n    print(i, end="")\n\narr = [0]*5\nfor i in range(5):\n    arr[i] = i\n\ntotal = 0\nfor i in range(5):\n    total = total + arr[i]\n\nif total == 10:\n    print("Correct", end="")\n\nz = 0\nwhile z < 5:\n    print(z, end="")\n    z += 1`,
      expected: '01234Correct01234',
      order: 35,
    },
    {
      title: 'Allocation Function',
      category: 'PYTHON',
      buggyCode: `n = 5\narr = []\n\nfor i in range(n):\n    arr[i] = i * 3\n\nfor i in range(n+1):\n    print(arr[i])\n\nsum = 0\nfor i in range(n):\n    sum += arr[i]\n\nif sum == 30:\n    print("Sum correct")\n\nx\nif x == 0:\n    print("Zero")\n\ny = 20/0`,
      solution: `n = 5\narr = []\n\nfor i in range(n):\n    arr.append(i * 3)\n\nfor i in range(n):\n    print(arr[i], end="")\n\nsum = 0\nfor i in range(n):\n    sum += arr[i]\n\nif sum == 30:\n    print("Sum correct", end="")\n\nx = 0\nif x == 0:\n    print("Zero", end="")`,
      expected: '036912Sum correctZero',
      order: 36,
    },
    {
      title: 'Formula Processor',
      category: 'PYTHON',
      buggyCode: `n = 5\narr = [0]*5\n\nfor i in range(n):\n    arr[i] = i + 1\n\nfor i in range(n+1):\n    print(arr[i])\n\navg = 0\nfor i in range(n):\n    avg += arr[i]\n\navg = avg / n\n\nif avg = 3:\n    print("Average is 3")\n\nx = 0\nwhile x < 5:\n    print(x)`,
      solution: `n = 5\narr = [0]*5\n\nfor i in range(n):\n    arr[i] = i + 1\n\nfor i in range(n):\n    print(arr[i], end="")\n\navg = 0\nfor i in range(n):\n    avg += arr[i]\n\navg = avg / n\n\nif avg == 3:\n    print("Average is 3", end="")\n\nx = 0\nwhile x < 5:\n    print(x, end="")\n    x += 1`,
      expected: '12345Average is 301234',
      order: 37,
    },
    {
      title: 'Value Comparison Check',
      category: 'PYTHON',
      buggyCode: `arr = [1,2,3,4]\nn = 4\n\nfor i in range(n):\n    print(arr[i])\n\nmax_val\nfor i in range(n):\n    if arr[i] > max_val:\n        max_val = arr[i]\n\nprint("Max =", max_val\n\nj = 0\nwhile j < n:\n    print(j)\n\nz = 5/0`,
      solution: `arr = [1,2,3,4]\nn = 4\n\nfor i in range(n):\n    print(arr[i], end="")\n\nmax_val = arr[0]\nfor i in range(n):\n    if arr[i] > max_val:\n        max_val = arr[i]\n\nprint("Max =", max_val, end="")\n\nj = 0\nwhile j < n:\n    print(j, end="")\n    j += 1`,
      expected: '1234Max = 40123',
      order: 38,
    },
    {
      title: 'State Verification Loop',
      category: 'PYTHON',
      buggyCode: `arr = [1,2,3]\n\nfor i in range(4):\n    print(arr[i])\n\nsum = 0\nfor i in range(3):\n    sum += arr[i]\n\nif sum == 6:\n    pass\n\nx = 1\nwhile x <= 5:\n    print(x)\n\na\nif a < 0:\n    print("Negative")`,
      solution: `arr = [1,2,3]\n\nfor i in range(3):\n    print(arr[i], end="")\n\nsum = 0\nfor i in range(3):\n    sum += arr[i]\n\nif sum == 6:\n    print("Six", end="")\n\nx = 1\nwhile x <= 5:\n    print(x, end="")\n    x += 1\n\na = -1\nif a < 0:\n    print("Negative", end="")`,
      expected: '123Six12345Negative',
      order: 39,
    },
    {
      title: 'Array Data Extraction',
      category: 'PYTHON',
      buggyCode: `n = 5\narr = [0]*5\n\nfor i in range(n):\n    arr[i] = i\n\nfor i in range(n):\n    print(arr[i]\n\ntotal = 0\nfor i in range(n+1):\n    total += arr[i]\n\nif total == 10:\n    print("OK")\n\nx = 10\nwhile x > 0:\n    print(x)\n\ny = 10/0`,
      solution: `n = 5\narr = [0]*5\n\nfor i in range(n):\n    arr[i] = i\n\nfor i in range(n):\n    print(arr[i], end="")\n\ntotal = 0\nfor i in range(n):\n    total += arr[i]\n\nif total == 10:\n    print("OK", end="")\n\nx = 10\nwhile x > 0:\n    print(x, end="")\n    x -= 1`,
      expected: '01234OK10987654321',
      order: 40,
    },
    {
      title: 'Accumulator Function',
      category: 'PYTHON',
      buggyCode: `arr = []\n\nfor i in range(5):\n    arr[i] = i * 2\n\nfor i in range(5):\n    print(arr[i])\n\nsum = 0\nfor i in range(5):\n    sum += arr[i]\n\nif sum == 20:\n    print("Correct")\n\nk = 0\nwhile k < 5:\n    print(k)\n\nd = 0/0`,
      solution: `arr = []\n\nfor i in range(5):\n    arr.append(i * 2)\n\nfor i in range(5):\n    print(arr[i], end="")\n\nsum = 0\nfor i in range(5):\n    sum += arr[i]\n\nif sum == 20:\n    print("Correct", end="")\n\nk = 0\nwhile k < 5:\n    print(k, end="")\n    k += 1`,
      expected: '02468Correct01234',
      order: 41,
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