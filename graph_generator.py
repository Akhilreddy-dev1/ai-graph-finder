"""
Standalone Python script to recreate graphs extracted by the AI Graph Finder app.
Run: python graph_generator.py
"""

import json
import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


def load_data(path: str) -> dict:
    """Load graph data from a JSON file saved by the Streamlit app."""
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_2d_chart(data: dict) -> go.Figure:
    df = pd.DataFrame({"x": data["x"], "y": data["y"]})
    chart_type = data.get("chart_type", "line")

    if chart_type == "bar":
        return px.bar(df, x="x", y="y", title=data.get("label", "Graph"))
    if chart_type == "scatter":
        return px.scatter(df, x="x", y="y", title=data.get("label", "Graph"))
    return px.line(df, x="x", y="y", title=data.get("label", "Graph"), markers=True)


def build_3d_chart(data: dict) -> go.Figure:
    z = data.get("z")
    if z and len(z) == len(data["x"]):
        df = pd.DataFrame({"x": data["x"], "y": data["y"], "z": z})
        return px.scatter_3d(
            df,
            x="x",
            y="y",
            z="z",
            title=data.get("label", "3D Graph"),
            color="z",
            size_max=12,
        )

    # Fallback: spin a 2D curve into 3D for visual depth
    import numpy as np

    x = np.array(data["x"], dtype=float)
    y = np.array(data["y"], dtype=float)
    theta = np.linspace(0, 2 * np.pi, len(x))
    z_synthetic = y * np.sin(theta)
    df = pd.DataFrame({"x": x, "y": y, "z": z_synthetic})
    return px.scatter_3d(
        df,
        x="x",
        y="y",
        z="z",
        title=data.get("label", "3D Graph (synthetic depth)"),
        color="z",
    )


def main() -> None:
    # Default demo data — replace with exported JSON from the app
    default_data = {
        "x": [1, 2, 3, 4, 5, 6, 7, 8],
        "y": [2, 5, 3, 8, 7, 12, 10, 15],
        "z": [1, 3, 2, 6, 5, 9, 8, 11],
        "label": "Sample Growth Curve",
        "chart_type": "line",
    }

    data = default_data
    if len(sys.argv) > 1:
        json_path = Path(sys.argv[1])
        if not json_path.exists():
            print(f"File not found: {json_path}")
            sys.exit(1)
        data = load_data(str(json_path))

    fig_2d = build_2d_chart(data)
    fig_3d = build_3d_chart(data)

    fig_2d.write_html("graph_2d.html")
    fig_3d.write_html("graph_3d.html")

    print(f"Saved graph_2d.html and graph_3d.html for '{data.get('label', 'Graph')}'")
    fig_2d.show()
    fig_3d.show()


if __name__ == "__main__":
    main()
