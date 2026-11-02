import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Stockroom — Café sales & analytics',description:'Sales, inventory, and actionable analytics. A portfolio project by Sakib Ahmed.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
