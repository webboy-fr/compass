/**
 * Generic math helpers.
 */
class PCWMath {
  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  static random(min, max) {
    return Math.random() * (max - min) + min;
  }

  static lerp(start, end, amount) {
    return start + (end - start) * amount;
  }
}

window.PCWMath = PCWMath;
