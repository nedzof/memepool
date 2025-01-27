export interface AnimationPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ANIMATION_DURATION = 800; // Base duration for animations in ms

class AnimationService {
  private animationContainer: HTMLDivElement | null = null;
  private isAnimating = false;
  private animationQueue: (() => Promise<void>)[] = [];

  initialize() {
    if (!this.animationContainer) {
      this.animationContainer = document.createElement('div');
      this.animationContainer.id = 'animationContainer';
      this.animationContainer.style.position = 'fixed';
      this.animationContainer.style.top = '0';
      this.animationContainer.style.left = '0';
      this.animationContainer.style.width = '100%';
      this.animationContainer.style.height = '100%';
      this.animationContainer.style.pointerEvents = 'none';
      this.animationContainer.style.zIndex = '9999';
      document.body.appendChild(this.animationContainer);
    }
  }

  cleanup() {
    if (this.animationContainer) {
      document.body.removeChild(this.animationContainer);
      this.animationContainer = null;
    }
  }

  private queueAnimation(callback: () => Promise<void>) {
    this.animationQueue.push(callback);
    this.processAnimationQueue();
  }

  private async processAnimationQueue() {
    if (this.isAnimating || this.animationQueue.length === 0) return;
    
    this.isAnimating = true;
    const nextAnimation = this.animationQueue.shift();
    if (nextAnimation) {
      await nextAnimation();
      setTimeout(() => {
        this.isAnimating = false;
        this.processAnimationQueue();
      }, ANIMATION_DURATION);
    }
  }

  async animateBlockShift(
    currentElement: HTMLElement,
    targetElement: HTMLElement,
    direction: 'left' | 'right'
  ): Promise<void> {
    if (!this.animationContainer) return;

    const currentRect = currentElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    // Calculate midpoint for arc movement
    const midX = (currentRect.left + targetRect.left) / 2;
    const midY = Math.min(currentRect.top, targetRect.top) - 100; // Arc height
    const midScale = direction === 'left' 
      ? Math.min(currentRect.width, 120) / currentRect.width
      : Math.max(currentRect.width, 120) / targetRect.width;

    // Create animated element
    const animatedElement = currentElement.cloneNode(true) as HTMLElement;
    animatedElement.style.position = 'fixed';
    animatedElement.style.top = `${currentRect.top}px`;
    animatedElement.style.left = `${currentRect.left}px`;
    animatedElement.style.width = `${currentRect.width}px`;
    animatedElement.style.height = `${currentRect.height}px`;
    animatedElement.style.margin = '0';
    animatedElement.style.transition = `all ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    animatedElement.style.transform = 'translate(0, 0) scale(1)';
    animatedElement.style.zIndex = '9999';

    // Add animated element to container
    this.animationContainer.appendChild(animatedElement);

    // Force reflow
    animatedElement.offsetHeight;

    // Start animation
    animatedElement.style.transform = `
      translate(
        ${targetRect.left - currentRect.left}px,
        ${targetRect.top - currentRect.top}px
      )
      scale(${direction === 'left' ? 0.3 : 3.33})
    `;

    // Hide original element during animation
    currentElement.style.opacity = '0';

    // Wait for animation to complete
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        if (this.animationContainer) {
          this.animationContainer.removeChild(animatedElement);
        }
        currentElement.style.opacity = '1';
        resolve();
      }, ANIMATION_DURATION);
    });
  }

  async animateBlockExchange(
    currentBlock: HTMLElement,
    upcomingBlock: HTMLElement,
    pastContainer: HTMLElement
  ): Promise<void> {
    return new Promise((resolve) => {
      this.queueAnimation(async () => {
        // First animate current block to past
        await this.animateBlockShift(currentBlock, pastContainer, 'left');
        
        // Then animate upcoming block to current
        await this.animateBlockShift(upcomingBlock, currentBlock, 'right');
      });
      resolve();
    });
  }
}

export const animationService = new AnimationService();
export default animationService; 