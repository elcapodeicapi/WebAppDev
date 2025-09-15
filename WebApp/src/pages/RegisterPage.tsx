import '../App.css';
import Navbar from '../components/NavBar';

export default function RegisterPage() {
  return (
    <div className="homepage">
      <Navbar />
      <div className="homepage-content">
        <div className="homepage-text">
          <h1>Create an Account</h1>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <input type="text" placeholder="Full Name" required />
            <input type="email" placeholder="Email" required />
            <input type="password" placeholder="Password" required />
            <button className="primary" type="submit">Register</button>
          </form>
        </div>
      </div>
    </div>
  );
}
