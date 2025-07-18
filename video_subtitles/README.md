# Generador de Subtítulos con Efectos Gráficos

Este proyecto permite generar subtítulos con efectos gráficos para tus videos utilizando inteligencia artificial y procesamiento de video.

## Características

- Transcripción automática de audio a texto usando Whisper
- Generación de subtítulos con efectos visuales personalizables
- Soporte para múltiples formatos de video
- Fácil de usar con una interfaz de línea de comandos

## Requisitos

- Python 3.8 o superior
- FFmpeg (necesario para el procesamiento de video)
- Una GPU con CUDA es recomendada para mejor rendimiento (opcional)

## Instalación

1. Clona este repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd video_subtitles
```

2. Crea y activa un entorno virtual (recomendado):
```bash
python -m venv venv
source venv/bin/activate  # En Windows: .\venv\Scripts\activate
```

3. Instala las dependencias:
```bash
pip install -r requirements.txt
```

## Uso

1. Coloca tu archivo de video en la carpeta `input` con el nombre `input_video.mp4`
2. Ejecuta el script principal:
```bash
python src/main.py
```
3. El video con subtítulos se guardará en la carpeta `output`

## Personalización

Puedes personalizar los efectos de los subtítulos modificando los siguientes parámetros en el archivo `src/main.py`:

```python
subtitle_clips = subtitler.create_subtitle_clips(
    segments,
    video_size=video_clip.size,
    fontsize=28,              # Tamaño de la fuente
    color='white',            # Color del texto
    font='Arial-Bold',        # Fuente del texto
    stroke_color='black',     # Color del borde
    stroke_width=2.0          # Ancho del borde
)
```

## Estructura del Proyecto

```
video_subtitles/
├── input/                   # Carpeta para los videos de entrada
├── output/                  # Carpeta para los videos procesados
├── src/
│   └── main.py              # Script principal
├── requirements.txt         # Dependencias del proyecto
└── README.md               # Este archivo
```

## Notas

- El primer uso descargará el modelo de Whisper, lo que puede tomar varios minutos dependiendo de tu conexión a internet.
- Para videos largos, el procesamiento puede tardar varios minutos.
- Se recomienda usar el modelo "base" para un buen equilibrio entre velocidad y precisión. Puedes cambiarlo a "small", "medium" o "large" para mejor precisión (a costa de más recursos).

## Licencia

Este proyecto está bajo la Licencia MIT.