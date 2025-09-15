import '../App.css'
import bannerImage from '../assets/Calender Event-Platform.png';
import Navbar from '../components/NavBar';


export default function HomePage() {
  return (
    <div className="homepage">
      <Navbar />
          <div className="hero-section">
      <img
        src= {bannerImage}
        alt="Hero"
        className="hero-image"
      />
      <div className="hero-text">
        <h1>The Only Complete Calendar Event-Platform</h1>
        <p>
          Our platform is everything you need for scheduling, event management, reminders, and more—all in one place.
        </p>
        <div className="homepage-buttons">
          <button className="primary">Get Started</button>
          <button className="secondary">Explore for Free</button>
        </div>
      </div>
    </div>
        </div>
  
  )
}
