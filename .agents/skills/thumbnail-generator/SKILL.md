---
name: thumbnail-generator
description: Generates high-converting YouTube thumbnails for Manhwa/Webtoon recaps using optimized prompts.
---

# Thumbnail Generator Skill

When the user invokes this skill (e.g., by asking to create a thumbnail or mentioning the thumbnail-generator), you will help them generate a high-converting YouTube thumbnail concept for their Manhwa/Webtoon recap videos.

## Process

1. **Ask for Video Details**: If the user hasn't provided them, ask for the video's title, the main emotion/vibe (e.g., betrayal, romance, villainess revenge), and the main character's appearance.
2. **Construct the Prompt**: Build a highly optimized image generation prompt using the following formula:
   > "A vibrant anime style YouTube thumbnail for a [genre] manhwa recap. An expressive, [emotion] [character description] looking at the viewer. A glowing, high-contrast [color] neon border around the image. The overall mood is [mood]. No text in the image."
3. **Generate Image**: Use your `generate_image` tool with `AspectRatio: '16:9'` and the constructed prompt.
4. **Present the Thumbnail**: Show the generated image to the user using markdown `![caption](absolute_path)`.
5. **Suggest Text Overlays**: Since AI struggles to render perfect text, suggest exactly what 3-5 words of text the user should manually add over the image using an editor like Canva or Photoshop. Provide 3 punchy, high-CTR text overlay options (e.g., "HE BETRAYED HER", "A FAKE PRINCESS?", "SHE REGRESSED").

## Design Guidelines
- **Aspect Ratio**: Always strictly use `16:9`.
- **Expressions**: Emphasize extreme facial expressions (crying, furious, evil smirk) so it reads clearly on mobile screens.
- **Lighting**: Ensure high contrast and vivid colors.
- **Text**: Explicitly tell the image generator NOT to include text, as the user will add it themselves.
