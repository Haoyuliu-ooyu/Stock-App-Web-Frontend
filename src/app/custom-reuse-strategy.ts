
//with the help of chatgpt

import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

export class CustomReuseStrategy implements RouteReuseStrategy {

  private storedHandles = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    // Only detach the route for caching when it is 'search/:ticker'
    return route.routeConfig?.path === 'search/:ticker';
  }

  store(route: ActivatedRouteSnapshot, detachedTree: DetachedRouteHandle | null): void {
    // Use a consistent handle key, for example, the full path
    const handleKey = this.getHandleKey(route);
    if (detachedTree && handleKey) {
      this.storedHandles.set(handleKey, detachedTree);
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    // Check if we have a stored route handle for this path
    const handleKey = this.getHandleKey(route);
    return !!handleKey && this.storedHandles.has(handleKey);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    // Return the stored handle for this route path
    const handleKey = this.getHandleKey(route);
    return handleKey ? this.storedHandles.get(handleKey) ?? null : null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    // Check if we should reuse the route
    return future.routeConfig === curr.routeConfig && future.params['ticker'] === curr.params['ticker'];
  }

  private getHandleKey(route: ActivatedRouteSnapshot): string | null {
    // Construct a key based on the route's path and parameters
    // You can customize this key as needed
    return route.routeConfig ? [route.routeConfig.path, route.params['ticker']].join('_') : null;
  }
}
