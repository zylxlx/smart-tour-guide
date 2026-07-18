import edge_tts
import asyncio
import io
import os
import struct
import threading
from app.core.config import settings


class TTSService:
    def __init__(self):
        self.voice = "zh-CN-XiaoxiaoNeural"
        self.rate = "+50%"
        self._local_lock = threading.Lock()
        self._sapi = None
        self._sapi_voice = None
        self._local_available = False
        try:
            import win32com.client
            self._sapi = win32com.client.Dispatch("SAPI.SpVoice")
            # 遍历找中文语音，优先 Huihui
            for v in self._sapi.GetVoices():
                name = v.GetDescription()
                if "Huihui" in name:
                    self._sapi_voice = v
                    break
            if self._sapi_voice is None:
                for v in self._sapi.GetVoices():
                    name = v.GetDescription()
                    if "Zira" in name or "chinese" in name.lower():
                        self._sapi_voice = v
                        break
            if self._sapi_voice:
                self._sapi.Voice = self._sapi_voice
            self._sapi.Rate = 4  # SAPI rate: -10~10, 4 = 较快
            self._local_available = True
        except Exception:
            self._local_available = False

    async def synthesize(self, text: str) -> io.BytesIO:
        # 优先用云端 Edge-TTS（音色更自然），本地 SAPI 保留作为备选
        if False:  # 禁用SAPI，改用Edge-TTS云端
            return await self._synthesize_sapi(text)
        return await self._synthesize_edge(text)

    async def _synthesize_sapi(self, text: str) -> io.BytesIO:
        """SAPI SpMemoryStream 纯内存合成 — 零文件IO，最快速度"""
        loop = asyncio.get_event_loop()

        def _run():
            import win32com.client
            with self._local_lock:
                stream = win32com.client.Dispatch("SAPI.SpMemoryStream")
                # 设置 WAV 格式: 16kHz 16bit mono
                wfx = struct.pack("<HHIIHH", 1, 1, 16000, 32000, 2, 16)
                stream.Format.Type = 18  # SAFT16kHz16BitMono 或 SAET22kHz16BitMono直接用22
                # SpMemoryStream 自动管理，直接设 output stream
                voice = self._sapi
                old_stream = voice.AudioOutputStream
                voice.AudioOutputStream = stream
                voice.Speak(text, 0)  # 0 = SVSFDefault，同步说完
                voice.AudioOutputStream = old_stream
                # 读取内存中的 WAV 数据
                stream.Seek(0, 0)  # STREAM_SEEK_SET
                data = stream.Read(stream.Length)
                # 如果 data 是 COM bytes，转为普通 bytes
                if hasattr(data, 'encode'):
                    data = bytes(data)
                return data

        audio_bytes = await loop.run_in_executor(None, _run)
        return io.BytesIO(audio_bytes)

    async def _synthesize_edge(self, text: str) -> io.BytesIO:
        communicate = edge_tts.Communicate(text, self.voice, rate=self.rate)
        audio_data = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.write(chunk["data"])
        audio_data.seek(0)
        return audio_data

    async def synthesize_to_file(self, text: str, output_path: str):
        if False:  # 禁用SAPI，改用Edge-TTS云端

            def _run():
                import win32com.client
                with self._local_lock:
                    stream = win32com.client.Dispatch("SAPI.SpFileStream")
                    stream.Format.Type = 18
                    stream.Open(output_path, 3, False)  # 3 = SSFMCreateForWrite
                    voice = self._sapi
                    old = voice.AudioOutputStream
                    voice.AudioOutputStream = stream
                    voice.Speak(text, 0)
                    voice.AudioOutputStream = old
                    stream.Close()

            await loop.run_in_executor(None, _run)
        else:
            communicate = edge_tts.Communicate(text, self.voice, rate=self.rate)
            await communicate.save(output_path)

    def set_voice(self, voice: str):
        self.voice = voice

    def set_speed(self, speed: float):
        if speed > 0:
            self.rate = f"+{int(speed * 100)}%"
        else:
            self.rate = f"{int(speed * 100)}%"

    @property
    def engine_type(self) -> str:
        return "sapi_memory" if self._local_available else "edge_cloud"


tts_service = TTSService()
