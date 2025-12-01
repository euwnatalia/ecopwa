import { useState } from 'react';
import { MATERIALES } from '../constants/materiales.js';
import './PuntoForm.css';

export default function PuntoForm({
  onSubmit,
  onCancel,
  initialData = {},
  isLoading = false,
  title = "Agregar Punto de Reciclaje"
}) {
  const [formData, setFormData] = useState({
    nombre: initialData.nombre || '',
    direccion: initialData.direccion || '',
    tipos: initialData.tipos || [],
    horarios: initialData.horarios || '',
    observaciones: initialData.observaciones || '',
    lat: initialData.lat || null,
    lng: initialData.lng || null
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.direccion.trim()) {
      newErrors.direccion = 'La dirección es obligatoria';
    }

    if (!formData.tipos || formData.tipos.length === 0) {
      newErrors.tipos = 'Debes seleccionar al menos un tipo de material';
    }

    if (formData.horarios && formData.horarios.length > 100) {
      newErrors.horarios = 'Los horarios deben tener menos de 100 caracteres';
    }

    if (formData.observaciones && formData.observaciones.length > 200) {
      newErrors.observaciones = 'Las observaciones deben tener menos de 200 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const cleanData = {
        ...formData,
        nombre: formData.nombre.trim(),
        direccion: formData.direccion.trim(),
        horarios: formData.horarios.trim() || undefined,
        observaciones: formData.observaciones.trim() || undefined
      };
      onSubmit(cleanData);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleMaterialToggle = (materialValue) => {
    setFormData(prev => {
      const newTipos = prev.tipos.includes(materialValue)
        ? prev.tipos.filter(t => t !== materialValue)
        : [...prev.tipos, materialValue];
      return { ...prev, tipos: newTipos };
    });
    if (errors.tipos) {
      setErrors(prev => ({ ...prev, tipos: null }));
    }
  };

  return (
    <div className="punto-form-overlay">
      <div className="punto-form-container">
        <div className="punto-form-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="close-btn"
            onClick={onCancel}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
          <div className="punto-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre">
                  Nombre del Punto <span className="required">*</span>
                </label>
                <input
                  id="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder="ej. Centro de Reciclaje Municipal"
                  className={errors.nombre ? 'error' : ''}
                  disabled={isLoading}
                  maxLength={50}
                />
                {errors.nombre && <span className="error-text">{errors.nombre}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="direccion">
                  Dirección <span className="required">*</span>
                </label>
                <input
                  id="direccion"
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                  placeholder="ej. Av. Colón 123, Córdoba"
                  className={errors.direccion ? 'error' : ''}
                  disabled={isLoading}
                  maxLength={100}
                />
                {errors.direccion && <span className="error-text">{errors.direccion}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>
                Tipos de Materiales <span className="required">*</span>
              </label>
              <div className="materials-grid">
                {MATERIALES.map(material => (
                  <div
                    key={material.value}
                    className={`material-option ${formData.tipos.includes(material.value) ? 'selected' : ''}`}
                    onClick={() => !isLoading && handleMaterialToggle(material.value)}
                    style={{
                      borderColor: formData.tipos.includes(material.value) ? material.color : '#e0e0e0',
                      backgroundColor: formData.tipos.includes(material.value) ? `${material.color}15` : 'white'
                    }}
                  >
                    <span className="material-icon">{material.icon}</span>
                    <span className="material-label">{material.label.split(' ').slice(1).join(' ') || material.label}</span>
                  </div>
                ))}
              </div>
              {errors.tipos && <span className="error-text">{errors.tipos}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="horarios">
                  Horarios <span className="optional">(opcional)</span>
                </label>
                <input
                  id="horarios"
                  type="text"
                  value={formData.horarios}
                  onChange={(e) => handleInputChange('horarios', e.target.value)}
                  placeholder="ej. Lun-Vie 8:00-17:00"
                  className={errors.horarios ? 'error' : ''}
                  disabled={isLoading}
                  maxLength={100}
                />
                {errors.horarios && <span className="error-text">{errors.horarios}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="observaciones">
                  Observaciones <span className="optional">(opcional)</span>
                </label>
                <textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => handleInputChange('observaciones', e.target.value)}
                  placeholder="Información adicional, requisitos especiales, etc."
                  className={errors.observaciones ? 'error' : ''}
                  disabled={isLoading}
                  maxLength={200}
                  rows={2}
                />
                <div className="char-count">
                  {formData.observaciones.length}/200
                </div>
                {errors.observaciones && <span className="error-text">{errors.observaciones}</span>}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Creando...
                </>
              ) : (
                'Crear Punto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}