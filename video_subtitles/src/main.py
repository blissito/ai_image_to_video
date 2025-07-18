import os
import whisper
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
from moviepy.video.tools.subtitles import SubtitlesClip
from moviepy.config import change_settings
from typing import List, Dict, Tuple
import json

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_DIR = os.path.join(BASE_DIR, 'input')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')

# Asegurarse de que los directorios existen
os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

class VideoSubtitler:
    def __init__(self, model_name: str = "base"):
        """
        Inicializa el subtitulador de video.
        
        Args:
            model_name: Nombre del modelo de Whisper a utilizar (tiny, base, small, medium, large)
        """
        self.model = whisper.load_model(model_name)
        
    def transcribe_video(self, video_path: str) -> List[Dict]:
        """
        Transcribe el audio de un video a texto.
        
        Args:
            video_path: Ruta al archivo de video
            
        Returns:
            Lista de segmentos de transcripción con marcas de tiempo
        """
        print("Iniciando transcripción del video...")
        result = self.model.transcribe(video_path)
        return result['segments']
    
    def format_time(self, seconds: float) -> str:
        """Formatea segundos a formato de tiempo para subtítulos (HH:MM:SS,mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:06.3f}".replace('.', ',')
    
    def create_subtitle_clips(self, 
                            subtitles: List[Dict], 
                            video_size: Tuple[int, int],
                            fontsize: int = 24, 
                            color: str = 'white',
                            font: str = 'Arial-Bold',
                            stroke_color: str = 'black',
                            stroke_width: float = 1.5) -> List[TextClip]:
        """
        Crea clips de subtítulos con efectos gráficos.
        
        Args:
            subtitles: Lista de segmentos de subtítulos
            video_size: Tamaño del video (ancho, alto)
            fontsize: Tamaño de la fuente
            color: Color del texto
            font: Fuente a utilizar
            stroke_color: Color del borde del texto
            stroke_width: Ancho del borde del texto
            
        Returns:
            Lista de clips de subtítulos con efectos
        """
        subtitle_clips = []
        
        for segment in subtitles:
            start_time = segment['start']
            end_time = segment['end']
            text = segment['text'].strip()
            
            # Crear clip de texto con efectos
            txt_clip = TextClip(
                text,
                fontsize=fontsize,
                color=color,
                font=font,
                stroke_color=stroke_color,
                stroke_width=stroke_width,
                size=(video_size[0] * 0.9, None),  # 90% del ancho del video
                method='caption',
                align='center'
            ).set_position(('center', video_size[1] * 0.85))  # Posición en la parte inferior
            
            # Añadir efectos de entrada/salida
            txt_clip = txt_clip.set_start(start_time).set_end(end_time)
            txt_clip = txt_clip.crossfadein(0.5).crossfadeout(0.5)
            
            subtitle_clips.append(txt_clip)
            
        return subtitle_clips
    
    def add_subtitles_to_video(self, 
                              input_video_path: str, 
                              output_video_path: str,
                              subtitle_clips: List[TextClip]):
        """
        Añade los subtítulos al video.
        
        Args:
            input_video_path: Ruta al video de entrada
            output_video_path: Ruta donde se guardará el video con subtítulos
            subtitle_clips: Lista de clips de subtítulos
        """
        print("Añadiendo subtítulos al video...")
        
        # Cargar el video
        video = VideoFileClip(input_video_path)
        
        # Crear un clip compuesto con el video y los subtítulos
        final_video = CompositeVideoClip([video] + subtitle_clips)
        
        # Escribir el video final
        final_video.write_videofile(
            output_video_path,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile='temp-audio.m4a',
            remove_temp=True,
            threads=4
        )
        
        # Cerrar los clips
        video.close()
        final_video.close()
        
        print(f"¡Video con subtítulos guardado en {output_video_path}!")

def get_first_video_file(directory):
    """Obtiene el primer archivo de video en el directorio especificado."""
    video_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv']
    for file in os.listdir(directory):
        if os.path.splitext(file)[1].lower() in video_extensions:
            return os.path.join(directory, file)
    return None

def main():
    # Configuración
    input_video = get_first_video_file(INPUT_DIR)
    
    # Verificar si se encontró un archivo de video
    if not input_video:
        print(f"Error: No se encontró ningún archivo de video en {INPUT_DIR}")
        print(f"Por favor, coloca un video en la carpeta 'input' con alguna de estas extensiones: .mp4, .mov, .avi, .mkv, .flv, .wmv")
        return
        
    # Crear nombre de archivo de salida
    base_name = os.path.splitext(os.path.basename(input_video))[0]
    output_video = os.path.join(OUTPUT_DIR, f"{base_name}_subtitulado.mp4")
    
    print(f"Procesando video: {os.path.basename(input_video)}")
    
    try:
        # Inicializar el subtitulador
        subtitler = VideoSubtitler(model_name="base")
        
        # 1. Transcribir el video
        print("\n--- Transcripción del video ---")
        segments = subtitler.transcribe_video(input_video)
        
        # Mostrar la transcripción
        print("\nTranscripción completada. Segmentos encontrados:")
        for i, segment in enumerate(segments):
            print(f"[{i+1}] {segment['text']}")
        
        # 2. Crear subtítulos con efectos
        print("\n--- Creando subtítulos con efectos ---")
        video_clip = VideoFileClip(input_video)
        subtitle_clips = subtitler.create_subtitle_clips(
            segments,
            video_size=video_clip.size,
            fontsize=28,
            color='white',
            font='Arial-Bold',
            stroke_color='black',
            stroke_width=2.0
        )
        
        # 3. Añadir subtítulos al video
        print("\n--- Procesando video final ---")
        subtitler.add_subtitles_to_video(
            input_video_path=input_video,
            output_video_path=output_video,
            subtitle_clips=subtitle_clips
        )
        
        print("\n¡Proceso completado exitosamente!")
        
    except Exception as e:
        print(f"\nError durante el proceso: {str(e)}")
    finally:
        if 'video_clip' in locals():
            video_clip.close()

if __name__ == "__main__":
    main()
