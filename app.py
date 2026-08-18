import base64
import json
import re
from datetime import datetime

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from groq import Groq

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="AI Graph Finder",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
CHAT_MODEL = "llama-3.3-70b-versatile"

# ── Custom CSS for 3D-style UI ───────────────────────────────────────────────
st.markdown(
    """
<style>
    .main { background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); }
    .block-container { padding-top: 1.5rem; }
    h1, h2, h3 { color: #e0e7ff !important; }
    .glass-card {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(99,102,241,0.3);
        border-radius: 16px;
        padding: 1.2rem;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .stat-pill {
        display: inline-block;
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        color: white;
        padding: 4px 14px;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    div[data-testid="stCameraInput"] { border-radius: 12px; overflow: hidden; }
</style>
""",
    unsafe_allow_html=True,
)

# ── Session state ────────────────────────────────────────────────────────────
if "graph_data" not in st.session_state:
    st.session_state.graph_data = None
if "chat_messages" not in st.session_state:
    st.session_state.chat_messages = []
if "last_image_b64" not in st.session_state:
    st.session_state.last_image_b64 = None


def get_client(api_key: str):
    return Groq(api_key=api_key) if api_key else None


def extract_json(raw: str) -> dict:
    """Pull the first JSON object from model output."""
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in AI response.")
    return json.loads(match.group(0))


def analyze_graph_image(client: Groq, image_bytes: bytes) -> dict:
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    st.session_state.last_image_b64 = b64

    prompt = (
        "Analyze this graph/chart image. Return ONLY a JSON object with these keys:\n"
        "  x: list of numbers (x-axis values)\n"
        "  y: list of numbers (y-axis values, same length as x)\n"
        "  z: list of numbers OR null (only if this is a 3D chart)\n"
        "  label: string title for the graph\n"
        "  chart_type: one of 'line', 'bar', 'scatter', '3d'\n"
        "No markdown, no explanation — JSON only."
    )

    completion = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                    },
                ],
            }
        ],
        temperature=0.1,
    )
    raw = completion.choices[0].message.content.strip()
    return extract_json(raw)


def build_2d_figure(data: dict) -> go.Figure:
    df = pd.DataFrame({"X": data["x"], "Y": data["y"]})
    title = data.get("label", "Detected Graph")
    chart_type = data.get("chart_type", "line")

    if chart_type == "bar":
        fig = px.bar(df, x="X", y="Y", title=title, color="Y", color_continuous_scale="Viridis")
    elif chart_type == "scatter":
        fig = px.scatter(df, x="X", y="Y", title=title, size="Y", color="Y", color_continuous_scale="Plasma")
    else:
        fig = px.line(df, x="X", y="Y", title=title, markers=True)

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(17,24,39,0.8)",
        font_color="#e0e7ff",
        title_font_size=18,
    )
    return fig


def build_3d_figure(data: dict) -> go.Figure:
    z = data.get("z")
    title = data.get("label", "3D Graph")

    if z and len(z) == len(data["x"]):
        df = pd.DataFrame({"X": data["x"], "Y": data["y"], "Z": z})
        fig = px.scatter_3d(
            df, x="X", y="Y", z="Z", title=title,
            color="Z", size_max=14, opacity=0.85,
            color_continuous_scale="Turbo",
        )
    else:
        import numpy as np
        x = np.array(data["x"], dtype=float)
        y = np.array(data["y"], dtype=float)
        t = np.linspace(0, 2 * np.pi, len(x))
        z_syn = y * np.sin(t)
        df = pd.DataFrame({"X": x, "Y": y, "Z": z_syn})
        fig = px.scatter_3d(
            df, x="X", y="Y", z="Z",
            title=f"{title} (3D projection)",
            color="Z", size_max=14, opacity=0.85,
            color_continuous_scale="Turbo",
        )

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        scene=dict(
            bgcolor="rgba(17,24,39,0.8)",
            xaxis=dict(color="#a5b4fc"),
            yaxis=dict(color="#a5b4fc"),
            zaxis=dict(color="#a5b4fc"),
        ),
        font_color="#e0e7ff",
    )
    return fig


def generate_python_code(data: dict) -> str:
    label = data.get("label", "My Graph").replace("'", "\\'")
    return f'''import json
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Data extracted by AI Graph Finder
data = {json.dumps(data, indent=4)}

df = pd.DataFrame({{"x": data["x"], "y": data["y"]}})

# 2D chart
chart_type = data.get("chart_type", "line")
if chart_type == "bar":
    fig_2d = px.bar(df, x="x", y="y", title="{label}")
elif chart_type == "scatter":
    fig_2d = px.scatter(df, x="x", y="y", title="{label}")
else:
    fig_2d = px.line(df, x="x", y="y", title="{label}", markers=True)
fig_2d.show()

# 3D chart
z = data.get("z")
if z and len(z) == len(data["x"]):
    df3 = pd.DataFrame({{"x": data["x"], "y": data["y"], "z": z}})
    fig_3d = px.scatter_3d(df3, x="x", y="y", z="z", title="{label} (3D)", color="z")
else:
    import numpy as np
    t = np.linspace(0, 2 * np.pi, len(data["x"]))
    z_syn = np.array(data["y"]) * np.sin(t)
    df3 = pd.DataFrame({{"x": data["x"], "y": data["y"], "z": z_syn}})
    fig_3d = px.scatter_3d(df3, x="x", y="y", z="z", title="{label} (3D projection)", color="z")
fig_3d.show()

# Save data for graph_generator.py
with open("graph_data.json", "w") as f:
    json.dump(data, f, indent=2)
print("Saved graph_data.json — run: python graph_generator.py graph_data.json")
'''


def chat_with_assistant(client: Groq, question: str, graph_context: dict | None) -> str:
    system = (
        "You are an expert math and data visualization assistant. "
        "Help users understand graphs, equations, and data trends. "
        "Be concise and friendly."
    )
    if graph_context:
        system += f"\n\nCurrent graph data: {json.dumps(graph_context)}"

    messages = [{"role": "system", "content": system}]
    for msg in st.session_state.chat_messages[-8:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": question})

    completion = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        temperature=0.4,
    )
    return completion.choices[0].message.content


# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Setup")
    st.markdown(
        "Get a free API key at [console.groq.com](https://console.groq.com/)"
    )
    api_key = st.text_input("Groq API Key", type="password")
    client = get_client(api_key)

    st.divider()
    st.subheader("Demo Mode")
    if st.button("Load Sample Graph", use_container_width=True):
        st.session_state.graph_data = {
            "x": [1, 2, 3, 4, 5, 6, 7, 8],
            "y": [2, 5, 3, 8, 7, 12, 10, 15],
            "z": [1, 3, 2, 6, 5, 9, 8, 11],
            "label": "Sample Growth Curve",
            "chart_type": "line",
        }
        st.rerun()

    if st.session_state.graph_data:
        st.success(f"Graph loaded: {st.session_state.graph_data.get('label', 'Untitled')}")

# ── Header ───────────────────────────────────────────────────────────────────
st.title("Smart Graph Camera & AI Assistant")
st.markdown(
    '<span class="stat-pill">3D Interactive</span> '
    '<span class="stat-pill">Camera Scanner</span> '
    '<span class="stat-pill">AI Chatbot</span>',
    unsafe_allow_html=True,
)
st.caption("Snap a photo of any graph → AI recreates it in 2D & 3D → get Python code instantly.")

# ── Tabs ─────────────────────────────────────────────────────────────────────
tab_camera, tab_graphs, tab_chat = st.tabs(["Camera Scanner", "3D Graph Studio", "AI Chat Assistant"])

# ── Tab 1: Camera ────────────────────────────────────────────────────────────
with tab_camera:
    col_cam, col_info = st.columns([3, 2])

    with col_cam:
        st.subheader("Step 1 — Capture a Graph")
        camera_img = st.camera_input("Point your camera at a graph or chart")

        if camera_img and not client:
            st.warning("Enter your Groq API key in the sidebar to analyze the image.")

        if camera_img and client:
            if st.button("Analyze Graph", type="primary", use_container_width=True):
                with st.spinner("AI is reading your graph..."):
                    try:
                        data = analyze_graph_image(client, camera_img.getvalue())
                        if "x" not in data or "y" not in data:
                            st.error("AI could not extract x/y coordinates. Try a clearer photo.")
                        elif len(data["x"]) != len(data["y"]):
                            st.error("X and Y lists have different lengths. Retake the photo.")
                        else:
                            st.session_state.graph_data = data
                            st.success(f"Graph detected: **{data.get('label', 'Untitled')}**")
                            st.rerun()
                    except json.JSONDecodeError:
                        st.error("AI returned invalid JSON. Try again with a clearer image.")
                    except Exception as exc:
                        st.error(f"Analysis failed: {exc}")

    with col_info:
        st.subheader("How it works")
        st.markdown(
            """
1. **Capture** — Use your webcam to photograph a graph
2. **Analyze** — AI extracts data points via vision model
3. **Visualize** — See interactive 2D & 3D charts
4. **Export** — Download Python code to recreate the graph
            """
        )
        if st.session_state.graph_data:
            d = st.session_state.graph_data
            st.metric("Data Points", len(d["x"]))
            st.metric("Chart Type", d.get("chart_type", "line").upper())

# ── Tab 2: Graphs ────────────────────────────────────────────────────────────
with tab_graphs:
    data = st.session_state.graph_data

    if not data:
        st.info("Capture a graph in the **Camera Scanner** tab or load the sample graph from the sidebar.")
    else:
        view_mode = st.radio(
            "View Mode",
            ["2D Chart", "3D Chart", "Both Side-by-Side"],
            horizontal=True,
        )

        if view_mode == "2D Chart":
            st.plotly_chart(build_2d_figure(data), use_container_width=True)
        elif view_mode == "3D Chart":
            st.plotly_chart(build_3d_figure(data), use_container_width=True)
        else:
            c1, c2 = st.columns(2)
            with c1:
                st.plotly_chart(build_2d_figure(data), use_container_width=True)
            with c2:
                st.plotly_chart(build_3d_figure(data), use_container_width=True)

        st.divider()
        st.subheader("Python Code to Recreate This Graph")
        st.code(generate_python_code(data), language="python")

        col_dl1, col_dl2 = st.columns(2)
        with col_dl1:
            st.download_button(
                "Download Python Script",
                generate_python_code(data),
                file_name="replicate_graph.py",
                mime="text/x-python",
                use_container_width=True,
            )
        with col_dl2:
            st.download_button(
                "Download JSON Data",
                json.dumps(data, indent=2),
                file_name="graph_data.json",
                mime="application/json",
                use_container_width=True,
            )

# ── Tab 3: Chat ──────────────────────────────────────────────────────────────
with tab_chat:
    st.subheader("Ask the AI Graph Assistant")

    for msg in st.session_state.chat_messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if prompt := st.chat_input("Ask about your graph, math, or data trends..."):
        st.session_state.chat_messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            if not client:
                reply = "Please enter your Groq API key in the sidebar to chat."
                st.info(reply)
            else:
                with st.spinner("Thinking..."):
                    try:
                        reply = chat_with_assistant(
                            client, prompt, st.session_state.graph_data
                        )
                        st.markdown(reply)
                    except Exception as exc:
                        reply = f"Chat error: {exc}"
                        st.error(reply)
            st.session_state.chat_messages.append({"role": "assistant", "content": reply})

    if st.session_state.chat_messages:
        if st.button("Clear Chat History"):
            st.session_state.chat_messages = []
            st.rerun()

    if st.session_state.graph_data:
        st.caption(
            f"Assistant has context for: **{st.session_state.graph_data.get('label', 'current graph')}**"
        )
