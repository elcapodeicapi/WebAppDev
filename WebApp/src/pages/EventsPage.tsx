import '../App.css';
import Navbar from '../components/NavBar';

export default function EventsPage() {
  const events = [
    {
      id: 1,
      title: "Netwerkborrel voor Professionals",
      date: "10 oktober 2025",
      location: "Amsterdam, Zuidas",
      description:
        "Een gezellige borrel met collega’s uit verschillende sectoren. Perfect om je netwerk uit te breiden.",
    },
    {
      id: 2,
      title: "Workshop Timemanagement",
      date: "18 oktober 2025",
      location: "Rotterdam, WTC",
      description:
        "Leer slimme technieken om je werkdag productiever in te delen en stress te verminderen.",
    },
    {
      id: 3,
      title: "Conferentie Duurzaam Ondernemen",
      date: "25 oktober 2025",
      location: "Utrecht, Jaarbeurs",
      description:
        "Inspirerende sprekers en sessies over de toekomst van duurzaam werken en ondernemen.",
    },
  ];

  return (
    <div className="homepage">
      <Navbar />
      <header className="header">
        <h1>Evenementen voor Werkmensen</h1>
        <p>
          Ontdek inspirerende workshops, conferenties en netwerkmomenten die
          jouw carrière vooruit helpen.
        </p>
      </header>

      <main className="events-container">
        {events.map((event) => (
          <div key={event.id} className="event-card">
            <h2>{event.title}</h2>
            <p><strong>Datum:</strong> {event.date}</p>
            <p><strong>Locatie:</strong> {event.location}</p>
            <p>{event.description}</p>
            <button className="event-button">Meer info</button>
          </div>
        ))}
      </main>
    </div>
  );
}