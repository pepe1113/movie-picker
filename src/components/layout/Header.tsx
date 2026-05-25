import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Film,
  Heart,
  History,
  Languages,
  LogOut,
  Menu,
  Search,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import { ROUTES } from '@/utils/constants'
import { Marquee } from './Marquee'

export function Header() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated, user, signIn, signOut } = useAuthStore()
  const { language, setLanguage } = useLanguageStore()
  const ticker = t('footer.ticker')

  const NAV_ITEMS = [
    { label: t('nav.home'), href: ROUTES.HOME, icon: Film },
    { label: t('nav.wishlist'), href: ROUTES.WISHLIST, icon: Heart },
    { label: t('nav.history'), href: ROUTES.HISTORY, icon: History },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(trimmed)}`)
      setSearchQuery('')
    }
  }

  return (
    <>
      <header className="border-border bg-background/90 sticky top-0 z-50 w-full border-b shadow-[rgba(0,0,0,0.5)_0px_8px_24px] backdrop-blur">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          {/* Logo */}

          <Link
            to={ROUTES.HOME}
            className="text-foreground flex items-center gap-2 text-sm font-bold"
          >
            <span className="flex items-center justify-center">
              <img src="/popcorn.gif" alt="Popcorn" className="size-7" />
            </span>
            <span className="hidden sm:inline">Movie Picker</span>
          </Link>

          {/* 桌面版導航 */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  [
                    'text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors',
                    isActive ? 'bg-secondary text-foreground' : '',
                  ].join(' ')
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* 搜尋列 - 桌面版 */}
          <form
            onSubmit={handleSearch}
            className="ml-auto hidden max-w-sm flex-1 md:flex"
          >
            <div className="relative w-full">
              <Search className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
              <Input
                type="search"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-11"
              />
            </div>
          </form>

          {/* 右側操作 */}
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {/* 語言切換 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Languages className="size-4" />
                  <span className="hidden sm:inline">
                    {language === 'zh-TW' ? '繁體中文' : 'English'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setLanguage('zh-TW')}>
                  繁體中文
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('en')}>
                  English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 登入/使用者 */}
            {isAuthenticated ? (
              <>
                <div className="text-muted-foreground inline-flex h-9 items-center gap-2 px-2 text-sm font-medium">
                  <User className="size-4" />
                  <span className="hidden max-w-32 truncate sm:inline">
                    {user?.displayName ?? t('common.user')}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">{t('common.logout')}</span>
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => signIn()}>
                <User className="size-4" />
                <span className="hidden sm:inline">{t('common.login')}</span>
              </Button>
            )}
            {/* 手機版選單 */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="size-5" />
                  <span className="sr-only">{t('common.menu')}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full">
                      <Film className="size-5" />
                    </span>
                    Movie Picker
                  </SheetTitle>
                </SheetHeader>

                {/* 手機搜尋列 */}
                <form onSubmit={handleSearch} className="px-4">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
                    <Input
                      type="search"
                      placeholder={t('common.search')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-11"
                    />
                  </div>
                </form>

                {/* 手機導航 */}
                <nav className="flex flex-col gap-1 px-4">
                  {NAV_ITEMS.map((item) => (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className="justify-start"
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link to={item.href}>
                        <item.icon className="size-4" />
                        {item.label}
                      </Link>
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <Marquee ticker={ticker} />
    </>
  )
}
