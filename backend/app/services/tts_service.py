import edge_tts
import asyncio
import io
from app.core.config import settings

class TTSService:
    def __init__(self):
        self.voice = "zh-CN-XiaoxiaoNeural"
        self.rate = "+0%"

    async def synthesize(self, text: str) -> io.BytesIO:
        """文本转语音，返回音频流"""
        communicate = edge_tts.Communicate(text, self.voice, rate=self.rate)
        audio_data = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.write(chunk["data"])
        audio_data.seek(0)
        return audio_data

    async def synthesize_to_file(self, text: str, output_path: str):
        """文本转语音，保存到文件"""
        communicate = edge_tts.Communicate(text, self.voice, rate=self.rate)
        await communicate.save(output_path)

    def set_voice(self, voice: str):
        self.voice = voice

    def set_speed(self, speed: float):
        if speed > 0:
            self.rate = f"+{int(speed * 100)}%"
        else:
            self.rate = f"{int(speed * 100)}%"

tts_service = TTSService()
