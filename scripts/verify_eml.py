from email import policy
from email.parser import BytesParser
from pathlib import Path

message = BytesParser(policy=policy.default).parsebytes(Path("test-results/unicode.eml").read_bytes())
assert not message.defects, message.defects
assert message["To"] == "tanaka@example.com"
assert message["Subject"] == "月次報告" * 30
attachments = list(message.iter_attachments())
assert len(attachments) == 1
assert attachments[0].get_filename().startswith("東京支店")
assert attachments[0].get_content().startswith(b"PK")
print("EML parsed: Unicode subject, filename, and XLSX attachment are intact.")
