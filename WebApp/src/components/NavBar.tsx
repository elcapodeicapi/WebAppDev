import '../App.css';
import logo from '../assets/Cavent logo.png'; 

export default function Navbar() {
  return (
    <nav className="navbar">
      {/* Left: Logo */}
      <div className="navbar-left">
        <a href="/">
          <img src={logo} alt="Logo" className="navbar-logo" />
        </a>
      </div>

      {/* Center: Nav links */}
      <div className="navbar-center">
        <a href="/">Home</a>
        <a href="/calendar">Calendar</a> {/* ✅ new page */}
        <a href="/contact">Contact</a>
      </div>

      {/* Right: Login button */}
      <div className="navbar-right">
        <a href="/login">
          <button className="primary">Login</button>
        </a>
      </div>
    </nav>
  );
}

