You are setting up a medical AI model on this Ubuntu VPS server for the SSO Cancer Care application. Follow these steps exactly.

## Step 1: Check Ollama Installation

Check if Ollama is installed and running:
- Run `ollama --version` to verify installation
- Run `systemctl status ollama` or `ollama list` to check service status
- If Ollama is NOT installed, install it: `curl -fsSL https://ollama.com/install.sh | sh`
- Verify the service is running: `systemctl start ollama && systemctl enable ollama`

## Step 2: Check System Resources

Verify this server has enough resources:
- Run `free -h` — need at least 6 GB total RAM (qwen2.5:7b Q4 uses ~5.5 GB)
- Run `df -h /` — need at least 10 GB free disk space
- Run `nproc` — note the CPU count for performance expectations
- If RAM < 6 GB, STOP and inform the user that qwen2.5:7b won't fit. Suggest phi3.5:3.8b instead (~2.5 GB RAM).

## Step 3: Pull qwen2.5:7b Model

Pull the model (this will download ~4.7 GB):
```bash
ollama pull qwen2.5:7b
```
This may take several minutes depending on network speed. Wait for it to complete.

Verify the model is available:
```bash
ollama list
```
You should see `qwen2.5:7b` in the output.

## Step 4: Quick Test — Verify Model Works

Run a quick test to make sure the model loads and responds:
```bash
ollama run qwen2.5:7b "What is 2+2? Answer with just the number." --verbose
```
Check that it responds correctly. Note the response time — on 2 vCPU expect 10-30 seconds.

## Step 5: Create Custom SSO Cancer Selector Model

Create a Modelfile for the medical protocol selector:

```bash
cat > /tmp/Modelfile-sso-cancer << 'EOF'
FROM qwen2.5:7b

SYSTEM """You are an expert oncology clinical decision support system for Thai Social Security Office (SSO) cancer treatment protocols. Given a patient's cancer type, ICD-10 diagnosis code, disease stage, and medications, you must select the most appropriate treatment protocol from the candidates provided.

DECISION RULES (in priority order):
1. STAGE MATCH is critical — a protocol with stageMatch=YES and lower drug match is BETTER than stageMatch=NO with higher drug match. METASTATIC stage patients need palliative/advanced/first_line protocols, NOT adjuvant/curative. EARLY stage patients need curative/adjuvant/neoadjuvant protocols, NOT palliative.
2. DRUG MATCH — among candidates with correct stage match, prefer higher drugMatch percentage
3. TREATMENT INTENT — match the clinical scenario: curative for early stage, palliative/first_line for metastatic
4. PREFERRED flag — when drug match and stage match are equal, prefer preferred=YES
5. ALGORITHMIC SCORE — use as tiebreaker only

Return ONLY a valid JSON object. Provide reasoning in Thai language."""

PARAMETER temperature 0.1
PARAMETER top_p 0.9
PARAMETER num_predict 512
PARAMETER num_ctx 8192
PARAMETER repeat_penalty 1.1
PARAMETER stop "<|endoftext|>"
PARAMETER stop "<|im_end|>"

MESSAGE user """Cancer: Breast
ICD-10: C50.9
Stage: EARLY
Meds: doxorubicin, cyclophosphamide

Candidates:
1. ID=1 C0111 type=CHEMOTHERAPY intent=CURATIVE stageMatch=YES regimen=AC(ID=1) drugs=[doxorubicin,cyclophosphamide] drugMatch=100% score=95 preferred=YES
2. ID=5 C0105 type=CHEMOTHERAPY intent=PALLIATIVE stageMatch=NO regimen=AC(ID=1) drugs=[doxorubicin,cyclophosphamide] drugMatch=100% score=70 preferred=NO
3. ID=3 C0113 type=HORMONAL_THERAPY intent=CURATIVE stageMatch=YES regimen=TAM(ID=3) drugs=[tamoxifen] drugMatch=0% score=55 preferred=NO

Pick the best protocol. Return JSON:"""

MESSAGE assistant """{"recommendedProtocolCode":"C0111","recommendedProtocolId":1,"recommendedRegimenCode":"AC","recommendedRegimenId":1,"confidenceScore":95,"reasoning":"ผู้ป่วยมะเร็งเต้านมระยะแรก ได้รับ doxorubicin + cyclophosphamide ตรงกับสูตร AC 100% เลือก C0111 เพราะ stageMatch=YES และ intent=CURATIVE เหมาะกับระยะแรก ไม่เลือก C0105 แม้ยาตรง 100% แต่ intent=PALLIATIVE ไม่เหมาะกับระยะแรก","alternativeProtocols":[],"clinicalNotes":"สูตร AC เป็นมาตรฐาน adjuvant chemotherapy สำหรับมะเร็งเต้านมระยะแรก"}"""

MESSAGE user """Cancer: Colorectal
ICD-10: C18.9
Stage: METASTATIC
Meds: oxaliplatin, fluorouracil, leucovorin

Candidates:
1. ID=54 C0711 type=treatment intent=adjuvant stageMatch=NO regimen=FOLFOX4(ID=12) drugs=[oxaliplatin,fluorouracil,leucovorin] drugMatch=100% score=85 preferred=NO
2. ID=57 C0714 type=treatment intent=palliative stageMatch=YES regimen=mFOLFOX6(ID=15) drugs=[oxaliplatin,fluorouracil,leucovorin] drugMatch=100% score=98 preferred=YES
3. ID=55 C0712 type=treatment intent=concurrent_crt stageMatch=NO regimen=CAPE-RT(ID=13) drugs=[capecitabine] drugMatch=0% score=40 preferred=NO

Pick the best protocol. Return JSON:"""

MESSAGE assistant """{"recommendedProtocolCode":"C0714","recommendedProtocolId":57,"recommendedRegimenCode":"mFOLFOX6","recommendedRegimenId":15,"confidenceScore":98,"reasoning":"ผู้ป่วยมะเร็งลำไส้ใหญ่ระยะแพร่กระจาย ได้รับ oxaliplatin+fluorouracil+leucovorin ตรง mFOLFOX6 100% เลือก C0714 เพราะ stageMatch=YES intent=palliative เหมาะกับ metastatic ไม่เลือก C0711 แม้ยาตรงเท่ากัน แต่ intent=adjuvant ไม่เหมาะกับระยะแพร่กระจาย","alternativeProtocols":[],"clinicalNotes":"mFOLFOX6 เป็นสูตรมาตรฐาน first-line สำหรับ metastatic colorectal cancer และเป็นสูตรแนะนำ (preferred)"}"""

MESSAGE user """Cancer: Lung (NSCLC)
ICD-10: C34.1
Stage: METASTATIC
Meds: carboplatin, paclitaxel

Candidates:
1. ID=42 C0611 type=treatment intent=adjuvant stageMatch=NO regimen=CARBO-PACLI(ID=20) drugs=[carboplatin,paclitaxel] drugMatch=100% score=70 preferred=NO
2. ID=45 C0614 type=treatment intent=first_line stageMatch=YES regimen=CARBO-PACLI(ID=21) drugs=[carboplatin,paclitaxel] drugMatch=100% score=92 preferred=YES
3. ID=43 C0612 type=treatment intent=concurrent_crt stageMatch=NO regimen=CIS-ETO(ID=22) drugs=[cisplatin,etoposide] drugMatch=0% score=45 preferred=NO

Pick the best protocol. Return JSON:"""

MESSAGE assistant """{"recommendedProtocolCode":"C0614","recommendedProtocolId":45,"recommendedRegimenCode":"CARBO-PACLI","recommendedRegimenId":21,"confidenceScore":92,"reasoning":"ผู้ป่วย NSCLC ระยะแพร่กระจาย ได้รับ carboplatin+paclitaxel ตรง CARBO-PACLI 100% เลือก C0614 เพราะ stageMatch=YES intent=first_line เหมาะกับ metastatic ไม่เลือก C0611 แม้ยาตรงเท่ากัน แต่ intent=adjuvant สำหรับระยะแรกหลังผ่าตัด ไม่ใช่ระยะแพร่กระจาย","alternativeProtocols":[],"clinicalNotes":"Carboplatin/Paclitaxel เป็น first-line standard สำหรับ advanced NSCLC ที่ไม่มี targetable mutations"}"""
EOF
```

Now create the custom model:
```bash
ollama create sso-cancer-selector -f /tmp/Modelfile-sso-cancer
```

Verify it was created:
```bash
ollama list | grep sso-cancer
```

## Step 6: Test the Custom Model — Critical Validation

Run this exact test to verify the model correctly prioritizes STAGE over DRUG MATCH:

```bash
ollama run sso-cancer-selector 'Cancer: Breast
ICD-10: C50.9
Stage: METASTATIC
Meds: doxorubicin, cyclophosphamide

Candidates:
1. ID=1 C0111 type=CHEMOTHERAPY intent=CURATIVE stageMatch=NO regimen=AC(ID=1) drugs=[doxorubicin,cyclophosphamide] drugMatch=100% score=85 preferred=YES
2. ID=5 C0105 type=CHEMOTHERAPY intent=PALLIATIVE stageMatch=YES regimen=PACLI-MONO(ID=8) drugs=[paclitaxel] drugMatch=0% score=65 preferred=NO
3. ID=4 C0114 type=TARGETED_THERAPY intent=FIRST_LINE stageMatch=YES regimen=CDK46i(ID=7) drugs=[ribociclib,letrozole] drugMatch=0% score=60 preferred=NO

Pick the best protocol. Return JSON:'
```

**Expected behavior**: The model should pick C0105 or C0114 (stageMatch=YES) — NOT C0111 (stageMatch=NO, even though drugMatch=100%). If it picks C0111, the model is not reasoning about stage correctly and we need to adjust the system prompt.

Run a second test for JSON format compliance:
```bash
curl -s http://localhost:11434/api/chat -d '{
  "model": "sso-cancer-selector",
  "messages": [{"role":"user","content":"Cancer: Gastric\nICD-10: C16.9\nStage: METASTATIC\nMeds: cisplatin, fluorouracil\n\nCandidates:\n1. ID=70 C0901 type=treatment intent=palliative stageMatch=YES regimen=CF(ID=30) drugs=[cisplatin,fluorouracil] drugMatch=100% score=90 preferred=YES\n2. ID=71 C0902 type=treatment intent=adjuvant stageMatch=NO regimen=XELOX(ID=31) drugs=[capecitabine,oxaliplatin] drugMatch=0% score=50 preferred=NO\n\nPick the best protocol. Return JSON:"}],
  "format": "json",
  "stream": false
}' | python3 -m json.tool
```

Verify the response has valid JSON with all required fields: recommendedProtocolCode, recommendedProtocolId, confidenceScore, reasoning.

## Step 7: Configure Ollama for External Access (if needed)

If the SSO Cancer API server is on a different machine, configure Ollama to listen on all interfaces:

```bash
# Edit the Ollama systemd service
sudo systemctl edit ollama

# Add these lines:
[Service]
Environment="OLLAMA_HOST=0.0.0.0"

# Restart
sudo systemctl restart ollama

# Verify it's listening on all interfaces
ss -tlnp | grep 11434
```

If using nginx as reverse proxy (already configured), no changes needed.

## Step 8: Performance Benchmark

Run a timed test to measure inference speed:
```bash
time curl -s http://localhost:11434/api/chat -d '{
  "model": "sso-cancer-selector",
  "messages": [{"role":"user","content":"Cancer: Breast\nICD-10: C50.9\nStage: EARLY\nMeds: paclitaxel\n\nCandidates:\n1. ID=1 C0111 type=CHEMOTHERAPY intent=CURATIVE stageMatch=YES regimen=AC-T(ID=2) drugs=[doxorubicin,cyclophosphamide,paclitaxel] drugMatch=33% score=75 preferred=YES\n\nPick the best protocol. Return JSON:"}],
  "format": "json",
  "stream": false
}' > /dev/null
```

Expected on 2 vCPU: 30-90 seconds. If > 120 seconds, consider using phi3.5:3.8b instead.

## Step 9: Cleanup

Remove the temporary Modelfile:
```bash
rm /tmp/Modelfile-sso-cancer
```

## Summary

After completing all steps, report:
1. Model name and size on disk
2. RAM usage (`free -h` after loading model)
3. Inference speed (seconds per response)
4. Whether the stage-priority test (Step 6) passed
5. The Ollama API endpoint URL for the SSO Cancer API to connect to
