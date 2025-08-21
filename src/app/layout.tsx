
import './globals.css'

import '@/init-admin'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
 
  return (
    <html>
      <body>
        <div className={` min-h-screen bg-gray-100`}>
      
            {/* 主要内容区 */}
            <main className="flex-1">
              {children}
            </main>
          </div>
          
       
       
      </body>
    </html>
  );
}
