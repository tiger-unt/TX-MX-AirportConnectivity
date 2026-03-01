import SiteHeader from './SiteHeader'
import MainNav from './MainNav'
import Footer from './Footer'

export default function PageWrapper({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <MainNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
