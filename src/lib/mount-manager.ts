import { createApp, Component } from 'vue'

class AppManager {
  private app = null;
  private component = null;

  constructor(component: Component) {
    this.component = component
  }

  mount(el: HTMLElement, mvtSdk: any) {
    this.app = createApp(this.component);
    this.app.provide('mvt', mvtSdk);
    this.app.mount(el);
  }

  unmount() {
    if (this.app) {
      this.app.unmount();
      this.app = null;
    }
  }
}

export function createMountPair(component: Component) {
  const appManager = new AppManager(component)

  return {
    mount: (el: HTMLElement, mvtSdk: any) => appManager.mount(el, mvtSdk),
    unmount: () => appManager.unmount()
  }
} 