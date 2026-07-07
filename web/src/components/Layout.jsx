import { Link, NavLink, Outlet } from 'react-router-dom'
import { BRAND, PAYMENT_URL } from '../lib/config'

function LogoMark() {
  return <img src="/logo.svg" alt="" className="logo-mark" aria-hidden="true" />
}

export default function Layout() {
  return (
    <div className="page">
      <header className="nav">
        <Link className="nav__logo" to="/" aria-label={BRAND}>
          <LogoMark />
          <span>{BRAND}</span>
        </Link>
        <nav className="nav__links" aria-label="Основная навигация">
          <NavLink to="/" end>
            Главная
          </NavLink>
          <NavLink to="/routines">Практики</NavLink>
          <a href="/#reviews">Отзывы</a>
          <a href="/#pricing">Подписка</a>
        </nav>
        <a className="btn btn--primary" href={PAYMENT_URL}>
          Начать
        </a>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer__col">
          <Link className="nav__logo" to="/">
            <LogoMark />
            <span>{BRAND}</span>
          </Link>
          <p className="footer__tagline">
            Тело любит движение. Даже 10 минут в день — это уже забота.
          </p>
        </div>
        <div className="footer__col">
          <h4>Разделы</h4>
          <Link to="/routines">Практики</Link>
          <a href="/#features">Возможности</a>
          <a href="/#reviews">Отзывы</a>
          <a href="/#pricing">Подписка</a>
        </div>
        <div className="footer__col">
          <h4>Документы</h4>
          <a href="#">Условия использования</a>
          <a href="#">Политика конфиденциальности</a>
          <a href="#">Cookie</a>
        </div>
        <div className="footer__col footer__col--copy">
          <span>© {new Date().getFullYear()} {BRAND}. Личный прототип.</span>
        </div>
      </footer>
    </div>
  )
}
