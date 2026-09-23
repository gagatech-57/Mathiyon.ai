"""
Mathiyon Subword Vocabulary Tokenizer Interface v1.1
Provides reproducible vocabulary training, serialization (save_vocab/load_vocab), encode(), decode(), and vocab_size.
"""
import os
import re
import json

class MathiyonTokenizer:
    def __init__(self, vocab_size=5000, vocab_path=None):
        self.pad_token = "<PAD>"
        self.unk_token = "<UNK>"
        self.bos_token = "<BOS>"
        self.eos_token = "<EOS>"
        
        self.pad_id = 0
        self.unk_id = 1
        self.bos_id = 2
        self.eos_id = 3

        self.vocab = {
            self.pad_token: 0,
            self.unk_token: 1,
            self.bos_token: 2,
            self.eos_token: 3,
        }
        self._vocab_size = vocab_size

        if vocab_path and os.path.exists(vocab_path):
            self.load_vocab(vocab_path)
        else:
            self._init_default_seed_vocab()

    def _init_default_seed_vocab(self):
        """Initializes default seed vocabulary."""
        words_seed = [
            "hello", "hi", "hey", "mathiyon", "ai", "slm", "neural", "model", "platform",
            "guna", "user", "assistant", "system", "name", "who", "what", "where", "how",
            "why", "when", "which", "is", "are", "am", "was", "were", "be", "been", "being",
            "i", "you", "he", "she", "it", "we", "they", "my", "your", "his", "her", "its",
            "our", "their", "me", "him", "them", "nice", "to", "meet", "welcome", "happy",
            "help", "today", "thanks", "thank", "great", "good", "morning", "evening",
            "மதியோன்", "வணக்கம்", "செயற்கை", "நுண்ணறிவு", "தமிழ்", "உங்களுடைய", "பெயர்",
            "என்", "உன்", "நன்றி", "நல்வரவு", "உதவி", "செயலி", "தரவு", "தொழில்நுட்பம்",
            "react", "component", "state", "props", "hooks", "useState", "useEffect", "jsx", "tsx",
            "javascript", "typescript", "node", "express", "jwt", "auth", "login", "signup",
            "register", "mongodb", "mongoose", "schema", "database", "python", "pytorch",
            "tensor", "fastapi", "uvicorn", "api", "route", "server", "client", "vite", "tailwind",
            "css", "html", "code", "function", "const", "let", "var", "import", "export", "default",
            "return", "class", "async", "await", "try", "catch", "if", "else", "for", "while",
            "array", "object", "string", "number", "boolean", "null", "undefined", "promise",
            "json", "fetch", "axios", "http", "https", "url", "port", "header", "body", "response",
            "request", "status", "message", "error", "success", "token", "password", "email",
            "learning", "learn", "study", "example", "explain", "simple", "complex",
            "application", "web", "app", "mobile", "frontend", "backend", "fullstack", "developer",
            "engineering", "intelligence", "architecture", "design", "system", "service",
            "process", "data", "memory", "context", "history", "chat", "conversation", "prompt",
            "generate", "output", "input", "result", "version", "engine", "prototype", "speed"
        ]
        
        curr_id = 4
        for w in words_seed:
            if w not in self.vocab:
                self.vocab[w] = curr_id
                curr_id += 1
                
        chars = "abcdefghijklmnopqrstuvwxyz0123456789.,!?-_/\\:;()[]{}@#$%^&*+=<>~ \n\t"
        for char in chars:
            if char not in self.vocab:
                self.vocab[char] = curr_id
                curr_id += 1

        while curr_id < self._vocab_size:
            dummy_subword = f"sub_{curr_id}"
            self.vocab[dummy_subword] = curr_id
            curr_id += 1

        self.inv_vocab = {v: k for k, v in self.vocab.items()}

    @property
    def vocab_size(self) -> int:
        return self._vocab_size

    def train_tokenizer(self, text_sources: list[str], target_vocab_size: int = 5000):
        """Trains subword vocabulary from text sources and saves configuration."""
        word_freq = {}
        for text in text_sources:
            tokens = re.findall(r'[\u0b80-\u0bff\w]+|[^\w\s]|\s', text.lower())
            for t in tokens:
                word_freq[t] = word_freq.get(t, 0) + 1

        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        
        # Build vocabulary
        new_vocab = {
            self.pad_token: 0,
            self.unk_token: 1,
            self.bos_token: 2,
            self.eos_token: 3,
        }
        curr_id = 4

        for word, _ in sorted_words:
            if curr_id >= target_vocab_size:
                break
            if word not in new_vocab:
                new_vocab[word] = curr_id
                curr_id += 1

        # Fallback characters
        chars = "abcdefghijklmnopqrstuvwxyz0123456789.,!?-_/\\:;()[]{}@#$%^&*+=<>~ \n\t"
        for ch in chars:
            if curr_id >= target_vocab_size:
                break
            if ch not in new_vocab:
                new_vocab[ch] = curr_id
                curr_id += 1

        while curr_id < target_vocab_size:
            dummy_subword = f"sub_{curr_id}"
            new_vocab[dummy_subword] = curr_id
            curr_id += 1

        self.vocab = new_vocab
        self.inv_vocab = {v: k for k, v in self.vocab.items()}
        self._vocab_size = target_vocab_size
        print(f"[OK] Tokenizer trained with vocab size: {len(self.vocab)}")


    def save_vocab(self, filepath: str):
        """Serializes vocabulary dictionary to JSON file."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({
                "vocab_size": self._vocab_size,
                "vocab": self.vocab
            }, f, ensure_ascii=False, indent=2)
        print(f"Saved tokenizer vocabulary to {filepath}")

    def load_vocab(self, filepath: str):
        """Loads serialized vocabulary dictionary from JSON file."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            self._vocab_size = data.get("vocab_size", 5000)
            self.vocab = data.get("vocab", {})
            self.inv_vocab = {v: k for k, v in self.vocab.items()}
        print(f"Loaded tokenizer vocabulary from {filepath} (vocab_size={self._vocab_size})")

    def encode(self, text: str) -> list[int]:
        """Encodes string input into list of token integer IDs."""
        if not text:
            return [self.bos_id, self.eos_id]

        text_clean = text.lower().strip()
        tokens = [self.bos_id]
        
        words = re.findall(r'[\u0b80-\u0bff\w]+|[^\w\s]|\s', text_clean)
        for w in words:
            if w in self.vocab:
                tokens.append(self.vocab[w])
            else:
                for ch in w:
                    tokens.append(self.vocab.get(ch, self.unk_id))
                    
        tokens.append(self.eos_id)
        return tokens

    def compute_unk_rate(self, text_samples: list[str]) -> float:
        """Calculates percentage of UNK tokens produced across a set of text samples."""
        total_tokens = 0
        unk_tokens = 0
        for text in text_samples:
            tokens = self.encode(text)
            total_tokens += len(tokens)
            unk_tokens += tokens.count(self.unk_id)
        if total_tokens == 0:
            return 0.0
        return round((unk_tokens / total_tokens) * 100, 2)

    def decode(self, tokens: list[int]) -> str:
        """Decodes list of token IDs back into readable string."""
        words = []
        for t in tokens:
            if t in (self.pad_id, self.bos_id, self.eos_id):
                continue
            token_str = self.inv_vocab.get(t, "")
            if token_str and not token_str.startswith("sub_"):
                words.append(token_str)
        
        raw_text = " ".join(words)
        cleaned = re.sub(r'\s+([.,!?])', r'\1', raw_text)
        return cleaned.strip()

