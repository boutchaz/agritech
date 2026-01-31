"""
Visualization utilities for satellite data.

Provides functions for creating enhanced visualizations with overlays,
color scales, and statistics annotations.
"""

import logging
from typing import Dict, Any, List, Tuple
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io
import base64

from app.services.satellite.types import VISUALIZATION_PARAMS, get_visualization_params

logger = logging.getLogger(__name__)


def get_visualization_params(index: str) -> Dict[str, Any]:
    """
    Get visualization parameters for a vegetation index.

    Args:
        index: Vegetation index name (e.g., "NDVI", "NDRE")

    Returns:
        Dictionary with min, max, and palette for visualization
    """
    params = get_visualization_params(index)
    return {
        "min": params.min,
        "max": params.max,
        "palette": params.palette,
        "description": params.description,
    }


def create_enhanced_visualization(
    image_array: np.ndarray,
    index: str,
    date: str,
    bounds: Dict[str, float],
    vis_params: Dict[str, Any],
    stats: Dict[str, float] = None,
) -> str:
    """
    Create enhanced visualization with date, scale bar, and statistics.

    Args:
        image_array: 2D numpy array of index values
        index: Vegetation index name
        date: Date string for the image
        bounds: Dictionary with min_lon, max_lon, min_lat, max_lat
        vis_params: Visualization parameters (min, max, palette)
        stats: Optional statistics dictionary

    Returns:
        Base64-encoded PNG data URL
    """
    try:
        # Normalize the array to 0-255 range
        normalized = normalize_array(image_array, vis_params["min"], vis_params["max"])

        # Apply color palette
        colored = apply_color_palette(normalized, vis_params["palette"])

        # Convert to PIL Image
        base_image = Image.fromarray(colored.astype(np.uint8))

        # Add overlays
        enhanced = add_overlays(
            base_image=base_image,
            index=index,
            date=date,
            stats=stats,
            vis_params=vis_params,
        )

        # Convert to base64 data URL
        buffer = io.BytesIO()
        enhanced.save(buffer, format="PNG")
        buffer.seek(0)

        img_data = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_data}"

    except Exception as e:
        logger.warning(f"Failed to create enhanced visualization: {e}")
        # Fallback: return a simple representation
        return _create_simple_visualization(image_array, index, vis_params)


def normalize_array(
    array: np.ndarray, min_val: float, max_val: float
) -> np.ndarray:
    """
    Normalize array values to 0-1 range.

    Args:
        array: Input array
        min_val: Minimum value for normalization
        max_val: Maximum value for normalization

    Returns:
        Normalized array with values 0-1
    """
    # Clip values to the specified range
    clipped = np.clip(array, min_val, max_val)

    # Normalize to 0-1
    if max_val > min_val:
        normalized = (clipped - min_val) / (max_val - min_val)
    else:
        normalized = np.zeros_like(array)

    return normalized


def apply_color_palette(
    normalized_array: np.ndarray, palette: List[str]
) -> np.ndarray:
    """
    Apply a color palette to a normalized array.

    Args:
        normalized_array: 2D array with values 0-1
        palette: List of hex color strings

    Returns:
        3D array (height, width, 3) with RGB values
    """
    height, width = normalized_array.shape
    colored = np.zeros((height, width, 3), dtype=np.uint8)

    # Convert hex colors to RGB
    rgb_palette = [hex_to_rgb(color) for color in palette]

    # For each pixel, interpolate between palette colors
    if len(rgb_palette) == 1:
        # Single color - just apply it with intensity
        rgb = rgb_palette[0]
        for i in range(3):
            colored[:, :, i] = (normalized_array * rgb[i]).astype(np.uint8)
    else:
        # Multiple colors - interpolate
        for y in range(height):
            for x in range(width):
                value = normalized_array[y, x]
                if not np.isnan(value) and 0 <= value <= 1:
                    # Find which segment we're in
                    segment_size = 1.0 / (len(rgb_palette) - 1)
                    segment_idx = min(
                        int(value / segment_size), len(rgb_palette) - 2
                    )

                    # Local position within segment
                    local_pos = (value - segment_idx * segment_size) / segment_size

                    # Interpolate
                    color1 = rgb_palette[segment_idx]
                    color2 = rgb_palette[segment_idx + 1]

                    rgb = [
                        int(color1[i] + (color2[i] - color1[i]) * local_pos)
                        for i in range(3)
                    ]
                    colored[y, x] = rgb

    return colored


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple"""
    if hex_color.startswith("#"):
        hex_color = hex_color[1:]
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def add_overlays(
    base_image: Image.Image,
    index: str,
    date: str,
    stats: Dict[str, float],
    vis_params: Dict[str, Any],
) -> Image.Image:
    """
    Add date label, color scale bar, and statistics to the image.

    Args:
        base_image: Base PIL Image
        index: Vegetation index name
        date: Date string
        stats: Statistics dictionary
        vis_params: Visualization parameters

    Returns:
        Enhanced PIL Image
    """
    # Create a larger canvas for overlays
    width, height = base_image.size
    new_width = width + 150  # Extra space for scale bar
    new_height = height + 100  # Extra space for title and stats

    # Create new image with white background
    enhanced = Image.new("RGB", (new_width, new_height), "white")

    # Paste the base image
    enhanced.paste(base_image, (0, 60))  # Leave space for title

    draw = ImageDraw.Draw(enhanced)

    # Try to load fonts, fallback to default
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
        label_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 14)
        stats_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 12)
    except:
        title_font = ImageFont.load_default()
        label_font = ImageFont.load_default()
        stats_font = ImageFont.load_default()

    # Add title
    title = f"{index} - Vegetation Index"
    draw.text((10, 10), title, fill="black", font=title_font)

    # Add date
    draw.text((width // 2 - 50, 40), date, fill="black", font=label_font)

    # Add color scale bar
    draw_color_scale(draw, width + 20, 80, vis_params, label_font)

    # Add statistics box
    if stats:
        draw_stats_box(draw, stats, index, 10, height + 70, stats_font)

    return enhanced


def draw_color_scale(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    vis_params: Dict[str, Any],
    font,
):
    """Draw color scale bar on the right side"""
    scale_height = 200
    scale_width = 20

    colors = vis_params.get("palette", ["red", "yellow", "green"])
    min_val = vis_params.get("min", -1)
    max_val = vis_params.get("max", 1)

    # Convert colors to RGB
    def get_rgb_color(color):
        if color.startswith("#"):
            return hex_to_rgb(color)
        color_map = {
            "red": (255, 0, 0),
            "yellow": (255, 255, 0),
            "green": (0, 255, 0),
            "blue": (0, 0, 255),
            "white": (255, 255, 255),
        }
        return color_map.get(color, (0, 255, 0))

    # Draw color gradient
    for i in range(scale_height):
        pos = i / scale_height

        if len(colors) > 1:
            segment_size = 1.0 / (len(colors) - 1)
            segment_idx = min(int(pos / segment_size), len(colors) - 2)
            local_pos = (pos - segment_idx * segment_size) / segment_size

            color1 = get_rgb_color(colors[segment_idx])
            color2 = get_rgb_color(colors[segment_idx + 1])

            r = int(color1[0] + (color2[0] - color1[0]) * local_pos)
            g = int(color1[1] + (color2[1] - color1[1]) * local_pos)
            b = int(color1[2] + (color2[2] - color1[2]) * local_pos)
            color = (r, g, b)
        else:
            color = get_rgb_color(colors[0])

        draw.rectangle(
            [x, y + (scale_height - i), x + scale_width, y + (scale_height - i) + 1],
            fill=color,
        )

    # Add scale labels
    for i, val in enumerate([max_val, (max_val + min_val) / 2, min_val]):
        label_y = y + i * (scale_height // 2)
        draw.text((x + scale_width + 5, label_y), f"{val:.1f}", fill="black", font=font)


def draw_stats_box(
    draw: ImageDraw.ImageDraw,
    stats: Dict[str, float],
    index: str,
    x: int,
    y: int,
    font,
):
    """Draw statistics box"""
    # Extract statistics
    mean = stats.get("mean", 0)
    median = stats.get("median", 0)
    p10 = stats.get("p10", 0)
    p90 = stats.get("p90", 0)
    std = stats.get("std", 0)

    # Draw background box
    box_width = 120
    box_height = 80
    draw.rectangle([x, y, x + box_width, y + box_height], fill="gray", outline="black")

    # Draw statistics text
    stats_text = [
        f"Mean: {mean:.3f}",
        f"Median: {median:.3f}",
        f"P10: {p10:.3f}",
        f"P90: {p90:.3f}",
        f"Std: {std:.3f}",
    ]

    for i, text in enumerate(stats_text):
        draw.text((x + 5, y + 5 + i * 15), text, fill="white", font=font)


def _create_simple_visualization(
    array: np.ndarray, index: str, vis_params: Dict[str, Any]
) -> str:
    """
    Create a simple visualization fallback.

    Returns a basic placeholder image when full visualization fails.
    """
    # Create a simple colored image based on the mean value
    mean_val = np.nanmean(array)

    # Interpolate color based on value
    min_val = vis_params.get("min", -1)
    max_val = vis_params.get("max", 1)
    normalized = (mean_val - min_val) / (max_val - min_val) if max_val > min_val else 0.5
    normalized = max(0, min(1, normalized))

    # Create a simple gradient image
    size = (200, 100)
    img = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(img)

    # Draw a rectangle with color based on value
    palette = vis_params.get("palette", ["red", "yellow", "green"])
    color = hex_to_rgb(palette[int(normalized * (len(palette) - 1))])

    draw.rectangle([50, 20, 150, 80], fill=color, outline="black")

    # Add text
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 16)
    except:
        font = ImageFont.load_default()

    draw.text((10, 5), f"{index}: {mean_val:.2f}", fill="black", font=font)

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    img_data = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_data}"
