# MICHI Motion System

Motion should clarify interaction and add a quiet sense of arrival. It must not delay public content or imply that a score, booking, source, or destination condition changed when it did not.

## Allowed motion

- Short opacity/transform transitions for section entry, selected filters, menu opening, and inline feedback.
- Typical durations: 140–220ms for control feedback and up to 450ms for an editorial reveal.
- Prefer `opacity` and `transform`; avoid animating dimensions or repeatedly measuring layout.
- Keep essential content visible when JavaScript is delayed or unavailable.

## Reduced motion

- Respect `prefers-reduced-motion: reduce` in CSS and any JavaScript animation.
- Remove entrance movement and smooth scrolling when reduction is requested; retain state changes and useful feedback.
- Do not use parallax, autoplay, infinite loops, or scroll-triggered motion that hides content.

## Interaction and accessibility

- Motion never replaces status text, focus movement, or an announced result.
- Dialogs and mobile navigation must place focus predictably, support Escape where appropriate, and return focus to the trigger when closed.
- Avoid motion that flashes, pulses, or causes vestibular discomfort.

## Performance

- Reuse the existing CSS reveal system unless a concrete interaction requires JavaScript.
- Do not add Framer Motion solely for decorative movement.
- Avoid adding scroll listeners or animation work to unrelated routes.
