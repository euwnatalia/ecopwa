import "./Profile.css";

function Profile() {
  return (
    <div className="profile-container">
      <h1>Perfil de Usuario</h1>

      <div className="profile-card">
        <img
          className="profile-avatar"
          src="https://i.imgur.com/6VBx3io.png"
          alt="Avatar"
        />
        <div className="profile-data">
          <p><strong>Nombre:</strong> Natalia</p>
          <p><strong>Email:</strong> natalia@example.com</p>
          <p><strong>Nivel:</strong> 3</p>
          <p><strong>Puntos:</strong> 1320</p>
        </div>
      </div>
    </div>
  );
}

export default Profile;
