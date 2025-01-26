export interface AnimationPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

class AnimationService {
  private animationContainer: HTMLDivElement | null = null;

  initialize() {
    this.animationContainer = document.createElement('div');
    this.animationContainer.id = 'animationContainer';
    document.body.appendChild(this.animationContainer);
  }

  moveToPastBlock(element: HTMLElement, startPos: AnimationPosition, endPos: AnimationPosition) {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.top = `${startPos.y}px`;
    clone.style.left = `${startPos.x}px`;
    clone.style.width = `${startPos.width}px`;
    clone.style.height = `${startPos.height}px`;
    clone.style.zIndex = '1000';
    clone.classList.add('animated-element', 'move-to-past');

    // Set CSS custom properties for animation
    clone.style.setProperty('--start-x', `${startPos.x}px`);
    clone.style.setProperty('--start-y', `${startPos.y}px`);
    clone.style.setProperty('--end-x', `${endPos.x}px`);
    clone.style.setProperty('--end-y', `${endPos.y}px`);

    this.animationContainer?.appendChild(clone);

    // Remove the clone after animation
    setTimeout(() => {
      clone.remove();
    }, 1500);
  }

  moveToCurrentMeme(element: HTMLElement, targetPos: AnimationPosition) {
    const rect = element.getBoundingClientRect();
    const clone = element.cloneNode(true) as HTMLElement;
    
    clone.style.position = 'fixed';
    clone.style.top = `${rect.top}px`;
    clone.style.left = `${rect.left}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.zIndex = '1000';
    clone.classList.add('animated-element', 'move-to-current');

    // Set CSS custom properties for animation
    clone.style.setProperty('--target-x', `${targetPos.x - rect.left}px`);
    clone.style.setProperty('--target-y', `${targetPos.y - rect.top}px`);

    this.animationContainer?.appendChild(clone);

    // Remove the clone after animation
    setTimeout(() => {
      clone.remove();
    }, 800);
  }

  slideBlock(element: HTMLElement, direction: 'left' | 'right') {
    element.classList.add(direction === 'left' ? 'slide-left' : 'slide-right');
  }

  slideUpcomingBlock(element: HTMLElement) {
    element.classList.add('slide-upcoming-right');
  }

  cleanup() {
    this.animationContainer?.remove();
    this.animationContainer = null;
  }
}

export const animationService = new AnimationService(); 