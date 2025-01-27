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

      // Add animation styles
      const style = document.createElement('style');
      style.textContent = `
        .animated-element {
          position: fixed;
          pointer-events: none;
          z-index: 1000;
          will-change: transform;
          transition: box-shadow 0.3s ease;
          opacity: 1 !important;
        }

        .move-to-past {
          animation: move-to-past 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .move-to-current {
          animation: move-to-current 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .shift-block {
          animation: shift-block 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes move-to-past {
          0% {
            transform: translate(0, 0) scale(var(--start-scale));
            box-shadow: 0 0 30px rgba(0, 255, 163, 0.6);
            opacity: 1;
          }
          50% {
            transform: translate(calc(var(--target-x) * 0.6), calc(var(--target-y) * 0.6)) scale(calc((var(--start-scale) + var(--end-scale)) * 0.5));
            box-shadow: 0 0 40px rgba(0, 255, 163, 0.8);
            opacity: 1;
          }
          100% {
            transform: translate(var(--target-x), var(--target-y)) scale(var(--end-scale));
            box-shadow: 0 0 20px rgba(0, 255, 163, 0.4);
            opacity: 1;
          }
        }

        @keyframes move-to-current {
          0% {
            transform: translate(0, 0) scale(var(--start-scale));
          }
          50% {
            transform: translate(calc(var(--target-x) * 0.5), calc(var(--target-y) * 0.5)) scale(calc(var(--end-scale) * 1.1));
          }
          100% {
            transform: translate(var(--target-x), var(--target-y)) scale(var(--end-scale));
          }
        }

        @keyframes shift-block {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(var(--shift-x), 0);
          }
        }
      `;
      document.head.appendChild(style);
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

  private createAnimatedElement(element: HTMLElement): HTMLElement {
    const rect = element.getBoundingClientRect();
    const animated = element.cloneNode(true) as HTMLElement;
    animated.style.position = 'fixed';
    animated.style.top = `${rect.top}px`;
    animated.style.left = `${rect.left}px`;
    animated.style.width = `${rect.width}px`;
    animated.style.height = `${rect.height}px`;
    animated.style.margin = '0';
    animated.style.zIndex = '1000';
    animated.classList.add('animated-element');
    
    // Add glow effect
    animated.style.boxShadow = '0 0 20px rgba(0, 255, 163, 0.4)';
    animated.style.transition = 'box-shadow 0.3s ease';
    
    return animated;
  }

  async animateBlockShift(
    currentElement: HTMLElement,
    targetElement: HTMLElement,
    direction: 'left' | 'right'
  ): Promise<void> {
    if (!this.animationContainer) return;

    const currentRect = currentElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    // Create animated element
    const animatedElement = this.createAnimatedElement(currentElement);

    // Calculate scale factors
    const scaleStart = direction === 'left' ? 1 : 0.3;
    const scaleEnd = direction === 'left' ? 0.3 : 1;

    // Set transform properties
    animatedElement.style.setProperty('--start-scale', String(scaleStart));
    animatedElement.style.setProperty('--end-scale', String(scaleEnd));
    animatedElement.style.setProperty('--target-x', `${targetRect.left - currentRect.left}px`);
    animatedElement.style.setProperty('--target-y', `${targetRect.top - currentRect.top}px`);

    // Add animation class
    animatedElement.classList.add(direction === 'left' ? 'move-to-past' : 'move-to-current');

    // Add animated element to container
    this.animationContainer.appendChild(animatedElement);

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
    pastContainer: HTMLElement,
    upcomingContainer: HTMLElement
  ): Promise<void> {
    if (!this.animationContainer) return;

    return new Promise((resolve) => {
      this.queueAnimation(async () => {
        // Hide the COMPETE button during animation
        const competeButton = currentBlock.querySelector('button');
        if (competeButton) {
          competeButton.style.opacity = '0';
          competeButton.style.pointerEvents = 'none';
        }

        // Get all blocks
        const upcomingBlocksArray = Array.from(upcomingContainer.children) as HTMLElement[];
        const pastBlocksArray = Array.from(pastContainer.children) as HTMLElement[];
        const lastUpcoming = upcomingBlocksArray[upcomingBlocksArray.length - 1];

        // Create animated clones for all blocks
        const animatedElements: HTMLElement[] = [];

        // Start animation
        requestAnimationFrame(() => {
          // Hide current block immediately as we'll show its animated clone
          currentBlock.style.opacity = '0';

          // 1. Create and animate current block to past
          const animatedCurrent = this.createAnimatedElement(currentBlock);
          const firstPastBlock = pastContainer.firstElementChild as HTMLElement;
          if (firstPastBlock) {
            const currentRect = currentBlock.getBoundingClientRect();
            const targetRect = firstPastBlock.getBoundingClientRect();
            
            // Calculate scale factor from current size to target size
            const scaleX = targetRect.width / currentRect.width;
            
            // Set transform properties for the animation
            animatedCurrent.style.setProperty('--start-scale', '1');
            animatedCurrent.style.setProperty('--end-scale', `${scaleX}`);
            animatedCurrent.style.setProperty('--target-x', `${targetRect.left - currentRect.left}px`);
            animatedCurrent.style.setProperty('--target-y', `${targetRect.top - currentRect.top}px`);
          }
          animatedCurrent.classList.add('move-to-past');
          if (this.animationContainer) {
            this.animationContainer.appendChild(animatedCurrent);
          }
          animatedElements.push(animatedCurrent);

          // Hide original blocks after clones are created
          requestAnimationFrame(() => {
            // Hide side blocks
            upcomingBlocksArray.forEach(block => {
              if (block !== lastUpcoming) {
                block.style.opacity = '0';
              }
            });
            pastBlocksArray.forEach(block => block.style.opacity = '0');

            // 2. Create and animate last upcoming to current
            const animatedUpcoming = this.createAnimatedElement(lastUpcoming);
            const currentRect = currentBlock.getBoundingClientRect();
            const lastRect = lastUpcoming.getBoundingClientRect();
            
            // Calculate scale factor for upcoming to current
            const scaleX = currentRect.width / lastRect.width;
            
            animatedUpcoming.style.setProperty('--start-scale', '1');
            animatedUpcoming.style.setProperty('--end-scale', `${scaleX}`);
            animatedUpcoming.style.setProperty('--target-x', `${currentRect.left - lastRect.left}px`);
            animatedUpcoming.style.setProperty('--target-y', `${currentRect.top - lastRect.top}px`);
            
            animatedUpcoming.classList.add('move-to-current');
            if (this.animationContainer) {
              this.animationContainer.appendChild(animatedUpcoming);
            }
            animatedElements.push(animatedUpcoming);

            // Hide last upcoming when its clone starts moving
            animatedUpcoming.addEventListener('animationstart', () => {
              lastUpcoming.style.opacity = '0';
            });

            // 3. Create and animate upcoming blocks
            upcomingBlocksArray.slice(0, -1).forEach((block, index) => {
              const nextBlock = upcomingBlocksArray[index + 1];
              const animated = this.createAnimatedElement(block);
              const nextRect = nextBlock.getBoundingClientRect();
              const currentRect = block.getBoundingClientRect();
              animated.style.setProperty('--shift-x', `${nextRect.left - currentRect.left}px`);
              animated.classList.add('shift-block');
              if (this.animationContainer) {
                this.animationContainer.appendChild(animated);
              }
              animatedElements.push(animated);
            });

            // 4. Create and animate past blocks
            pastBlocksArray.forEach((block, index) => {
              const nextBlock = pastBlocksArray[index + 1];
              if (nextBlock) {
                const animated = this.createAnimatedElement(block);
                const nextRect = nextBlock.getBoundingClientRect();
                const currentRect = block.getBoundingClientRect();
                animated.style.setProperty('--shift-x', `${nextRect.left - currentRect.left}px`);
                animated.classList.add('shift-block');
                if (this.animationContainer) {
                  this.animationContainer.appendChild(animated);
                }
                animatedElements.push(animated);
              }
            });

            // Wait for animations to complete
            setTimeout(() => {
              // Cleanup
              if (this.animationContainer) {
                animatedElements.forEach(el => this.animationContainer?.removeChild(el));
              }
              currentBlock.style.opacity = '1';
              upcomingBlock.style.opacity = '1';

              // Show the COMPETE button
              if (competeButton) {
                competeButton.style.opacity = '1';
                competeButton.style.pointerEvents = 'auto';
              }
            }, ANIMATION_DURATION);
          });
        });
      });
      resolve();
    });
  }
}

export const animationService = new AnimationService();
export default animationService; 