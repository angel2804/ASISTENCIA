# 📱 Movistar Asistencia Móvil

Aplicación web móvil diseñada para el **control y marcación de asistencia con geolocalización satelital (GPS), mapa interactivo y reportes directos a WhatsApp**.

---

## 🎯 Características Principales

### 👤 1. Para el Colaborador / Trabajador:
- **Ingreso de DNI:** Validación rápida con auto-completado del nombre y cargo del trabajador registrado.
- **Opción "Recordar en este celular":** Guarda el DNI en el teléfono para no tener que volver a escribirlo cada mañana.
- **Ubicación GPS Satelital Obligatoria:** 
  - El sistema exige y valida la activación del GPS antes de permitir la marcación.
  - Muestra la precisión satelital en metros y la dirección física obtenida por geocodificación inversa.
- **Marcación Exitosa & Comprobante Digital:**
  - Animación de confeti 🎉, sonido de confirmación y vibración háptica en el celular.
  - Muestra la hora exacta (HH:MM:SS), fecha, dirección y un **mapa interactivo Leaflet** con pin satelital.
- **Restricción de 1 Marcación por Día:**
  - Una vez registrada la asistencia del día, el sistema bloquea nuevas marcaciones para ese DNI hasta el día siguiente.
  - El trabajador puede ver su comprobante y mapa en cualquier momento.

### 🛡️ 2. Para el Administrador / Supervisor:
- **Resumen en Tiempo Real:** Total de asistencias del día, hora del primer ingreso y lista completa de trabajadores.
- **📲 Envío de Resumen por WhatsApp (Individual):**
  - Genera un mensaje formateado con:
    * Nombre y DNI del trabajador
    * Fecha y Hora exacta
    * Dirección y Coordenadas GPS
    * Enlace directo a Google Maps (`https://maps.google.com/?q=...`)
- **📋 Envío de Resumen General del Día a WhatsApp:**
  - Genera una lista consolidada de todo el equipo que marcó en el día, lista para enviar al grupo de supervisión con 1 solo clic.
- **Copiar al Portapapeles:** Para pegar el reporte en cualquier chat de WhatsApp Web o aplicación de mensajería.
- **Filtro por Fecha:** Consulta el historial de cualquier día anterior.
- **Modo Pruebas:** Botón para reiniciar las marcaciones de hoy y poder realizar pruebas continuas.

---

## 🚀 Cómo Iniciar la Aplicación

1. En la consola o terminal del proyecto, ejecuta:
   ```bash
   npm start
   ```

2. El servidor iniciará en:
   * **Desde la PC:** `http://localhost:3000`
   * **Desde tu Celular (Wi-Fi local):** 
     - **HTTPS (Recomendado para GPS):** `https://192.168.1.52:3443`
     - **HTTP:** `http://192.168.1.52:3000`

---

## 📱 Cómo Abrir en el Celular

1. Conecta tu celular a la misma red Wi-Fi de tu computadora.
2. Abre la cámara de tu celular y escanea el **Código QR** que aparece en la pantalla de la PC (o ingresa la URL `https://192.168.1.52:3443`).
3. En el navegador del celular, acepta el certificado local y autoriza el permiso de **Ubicación / GPS**.
4. ¡Listo! Puedes marcar tu asistencia con GPS satelital y mapa en tiempo real.

---

## 📁 Estructura del Proyecto

```
Movistar/
├── server.js              # Servidor Express API + HTTPS + Generador de QR
├── package.json           # Dependencias y scripts
├── data/
│   ├── colaboradores.json # Base de datos de trabajadores registrados
│   └── asistencias.json   # Historial persistente de asistencias
├── public/
│   ├── index.html         # Interfaz web móvil responsive + simulador desktop
│   ├── styles.css         # Estilos visuales Movistar, animaciones y radar GPS
│   ├── app.js             # Lógica cliente, geolocalización, mapa y WhatsApp
│   ├── sound.js           # Efectos de sonido Web Audio API
│   └── manifest.json      # Configuración PWA para celular
└── README.md
```
