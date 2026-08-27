import { NextResponse } from 'next/server';

const MOCK_USERS = [
  {
    user_id: 'usr-admin-111',
    first_name: 'Adebayo',
    last_name: 'Musa',
    email: 'manager@gigabyte.com',
    role_id: 'manager',
    role_name: 'Manager',
    department: 'Management',
    branch: 'Branch 001',
    status: 'ACTIVE'
  },
  {
    user_id: 'usr-sales-222',
    first_name: 'Shuaib',
    last_name: 'Olawale',
    email: 'sales@gigabyte.com',
    role_id: 'sales_officer',
    role_name: 'Sales/Customer Relations',
    department: 'Sales',
    branch: 'Branch 001',
    status: 'ACTIVE'
  }
];

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    // Simplistic auth verification for demo and testing
    const user = MOCK_USERS.find(u => u.email === email);
    if (!user || password !== 'gigabyte123') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid email or password. Use email: manager@gigabyte.com or sales@gigabyte.com with password: gigabyte123' 
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Auth failed' }, { status: 500 });
  }
}
