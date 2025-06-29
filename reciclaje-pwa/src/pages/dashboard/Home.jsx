import "./Home.css"; 

function Home() {
  return (
    <div className="home-container">
      <h1>¡Bienvenida a EcoPWA! 🌱</h1>

      <section className="home-section">
        <h2>Desafíos de la semana</h2>
        <div className="challenges">
          <div className="challenge">♻️ Reciclá 5 objetos</div>
          <div className="challenge">📷 Subí 3 fotos validadas</div>
        </div>
      </section>

      <section className="home-section">
        <h2>Tu progreso</h2>
        <div className="progress">
          <span>Nivel: 3</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "60%" }}></div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
