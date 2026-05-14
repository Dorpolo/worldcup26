import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { connectDB, UserModel } from '@worldcup26/db'
import { ProfileClient } from './ProfileClient'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()
  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  if (!user) redirect('/login')

  const mcpUrl = process.env.MCP_SERVER_URL ?? 'http://localhost:4001'

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-xl mx-auto space-y-5">
        <div>
          <h1 className="text-[15px] font-semibold" style={{ color: 'rgb(240 235 227)' }}>Profile</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgb(107 100 92)' }}>Your account and API access</p>
        </div>

        <ProfileClient
          name={user.name}
          email={user.email}
          apiKey={user.apiKey}
          mcpUrl={mcpUrl}
        />
      </div>
    </div>
  )
}
