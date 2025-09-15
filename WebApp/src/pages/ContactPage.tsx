import '../App.css';
import Navbar from '../components/NavBar';

export default function ContactPage() {
  return (
    <div className="homepage">
      <Navbar />
      <div className="homepage-content">
        <div className="homepage-text">
          <h1>Contact Us</h1>
          <p>If you have any questions, feel free to reach out to us.</p>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <input type="text" placeholder="Your Name" required />
            <input type="email" placeholder="Your Email" required />
            <textarea placeholder="Your Message" rows={4} required />
            <button className="primary" type="submit">Send Message</button>
          </form>
        </div>
      </div>
    </div>
  );
}
