# Vaulten Mascot Prompt Library

Use the attached mascot image as the visual reference for every generation. Generate separate transparent assets for animation instead of one large pose sheet.

## Character identity

The mascot is a small, rounded black-purple cat-like character with two pointed cat ears, a smooth oversized head, a compact soft body, short arms and legs, large glowing white oval eyes with no pupils, and a friendly expressive personality. It wears a dark black-purple hoodie with a raised hood, violet cuffs, violet neck trim, subtle pocket details, black jogger-style pants, and chunky white-and-violet sneakers.

The mascot represents Vaulten, a practical money-making education app. Its personality is encouraging, curious, energetic, patient, clever, and supportive. It helps beginners take practical steps toward earning money online.

## Master character prompt

```text
Use case: stylized-concept
Asset type: animation-ready mascot reference and transparent character asset

Primary request:
Create a consistent 3D mascot character for a money-making education app called Vaulten.

Input image:
Use the attached mascot image as the character reference. Preserve its identity and design.

Subject:
A small, rounded black cat-like character with two pointed cat ears, a smooth oversized head, a compact soft body, short arms and legs, large glowing white oval eyes with no pupils, and a friendly expressive personality. The character wears a dark black-purple hoodie with a raised hood, violet cuffs, violet neck trim, subtle pocket details, black jogger-style pants, and chunky white-and-violet sneakers.

Style/medium:
High-quality stylized 3D character render, polished mobile-app mascot design, soft rounded forms, toy-like proportions, premium animation quality, expressive body language, clean silhouette.

Color palette:
Near-black body and clothing, deep indigo shadows, electric violet highlights, lavender accents, white glowing eyes, small cyan and pink light reflections.

Lighting/mood:
Soft studio lighting with violet rim light, subtle blue fill light, gentle bloom around the eyes and edges, friendly futuristic learning-app atmosphere.

Composition:
Full body, centered, consistent proportions, neutral standing pose unless a specific pose is requested. Leave space around the character. Show the entire ears, hands, feet, and hoodie.

Constraints:
Keep the exact same character design, body proportions, clothing, colors, eye shape, ears, shoes, and lighting style in every image. No text, no labels, no logo, no watermark, no extra characters, and no props unless explicitly requested. Transparent background. Do not change the character into a realistic animal or human.
```

## Profile-sheet prompt

```text
Using the attached mascot image as the character reference, create a clean animation model sheet of the exact same Vaulten mascot.

Show separate full-body views:
1. front view
2. left profile
3. right profile
4. back view
5. three-quarter front view
6. three-quarter back view

Use identical proportions, hoodie design, shoes, glowing eyes, colors, and lighting in every view. Keep each pose neutral and symmetrical where appropriate. Arrange the views in a clean grid with generous spacing. No text, no labels, no decorative frame, no additional characters. Use a transparent or solid dark-purple background.
```

## Pose prompts

Add one pose prompt below to the master character prompt.

### Idle breathing

```text
Full-body idle animation pose. The mascot stands naturally with relaxed shoulders, arms slightly away from the body, knees soft, and a subtle friendly lean. Create the impression of gentle breathing and a tiny natural body sway. Calm, attentive, welcoming expression.
```

### Happy greeting

```text
The mascot waves enthusiastically with one hand while smiling through bright crescent-shaped glowing eyes. The other arm hangs naturally. One foot is slightly lifted for a playful greeting. Energetic but balanced full-body pose.
```

### Encouraging

```text
The mascot gives two thumbs up with both arms raised slightly. Bright happy eyes, confident open stance, chest lifted, feet planted apart. The pose should communicate: You can do this.
```

### Thinking

```text
The mascot sits cross-legged with one hand touching its chin and the other arm resting across its body. Curious thoughtful eyes, head tilted slightly to one side. Keep the pose readable and charming.
```

### Idea moment

```text
The mascot suddenly has an idea. One finger points upward, head tilted up, body leaning forward slightly, eyes glowing brightly. Add a small simple violet lightbulb above the head only if a prop is allowed. No text.
```

### Working on a laptop

```text
The mascot sits comfortably on the floor with a small simple laptop on its legs, typing with both hands. The laptop is minimal dark violet with no readable logo or text. Focused but happy expression. Keep the full character visible.
```

### Celebration

```text
The mascot jumps with both arms raised, one knee bent and one foot lifted behind. Bright excited crescent eyes, joyful energetic body language, small violet and pink sparkles around the character. No text.
```

### Mission complete

```text
The mascot stands proudly with one fist raised and the other hand on its hip. Bright confident eyes, strong open stance, celebratory energy. Add a subtle violet glow behind the character, no text or badge.
```

### Confused

```text
The mascot sits or stands with one hand touching its chin and the other arm folded. Head tilted slightly, eyes wide and uneven in expression, curious rather than sad. Keep the pose gentle and appealing.
```

### Concerned or blocked

```text
The mascot looks worried but supportive, with slightly lowered ears, rounded concerned eyes, shoulders gently lowered, and hands held together near the chest. The emotion should communicate: Let’s solve this together. Never fear or sadness.
```

### Listening

```text
The mascot sits attentively with both hands resting on its knees, head tilted slightly toward the viewer, bright focused eyes, relaxed posture. Friendly coach-like presence.
```

### Pointing to a lesson

```text
The mascot stands at a three-quarter angle and points clearly to the empty space on its right side, leaving generous negative space for app interface content. Friendly confident eyes, inviting posture, full body visible.
```

### Sleeping or rest state

```text
The mascot sleeps curled up comfortably with its hood visible, eyes closed, hands tucked near its body, and a peaceful relaxed posture. Add only a very subtle violet glow. No text or sleep symbols.
```

## Negative prompt

Use this with every generation.

```text
Do not change the character identity. No realistic cat, no human anatomy, no furry detailed animal texture, no extra ears, no tail unless explicitly requested, no fingers with human detail, no visible mouth unless requested, no pupils, no different clothing, no color changes, no extra characters, no text, no labels, no watermark, no logo, no cropped feet, no cropped ears, no distorted hands, no duplicate limbs, no inconsistent shoes, no background objects.
```

## Recommended animation state list

```text
idle
happy
thinking
idea
working
encouraging
celebrating
confused
concerned
listening
pointing
sleeping
```

## Production guidance

Generate each pose as a separate transparent PNG with the same camera angle, lighting, character proportions, and image dimensions. Use the profile sheet as a reference only, then generate clean individual poses for the app.

Keep the following consistent across every asset:

- canvas dimensions;
- camera distance and angle;
- character scale and center position;
- hoodie, pants, and sneaker design;
- eye shape and glow;
- violet and indigo lighting;
- transparent background;
- no text or watermark.

For animation, prefer small controlled motions: breathing, blinking, ear movement, hoodie bounce, hand gestures, head tilts, and subtle squash-and-stretch. Avoid changing the character's proportions between frames.
