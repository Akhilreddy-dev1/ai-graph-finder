with open("web/src/components/LandingPage3D.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Fix the style block lines 234-238 (0-indexed: 233-237)
lines[233] = "      <style>{`\n"
lines[234] = "        @keyframes spin { to { transform: rotate(360deg); } }\n"
lines[235] = "        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }\n"
lines[236] = "        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }\n"
lines[237] = "      `}</style>\n"

with open("web/src/components/LandingPage3D.jsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Style block fixed. Total lines:", len(lines))
# Verify
print("Lines 233-238:")
for i in range(233, 239):
    print(f"  {i+1}: {repr(lines[i])}")
