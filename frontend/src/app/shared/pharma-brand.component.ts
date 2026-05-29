import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pharma-brand',
  standalone: true,
  template: `
    <h1
      class="font-black uppercase tracking-tighter text-deep-navy dark:text-deep-navy leading-[0.9] select-none"
      [class]="hero ? 'text-5xl md:text-6xl lg:text-7xl -rotate-2' : 'text-2xl lg:text-3xl'"
    >
      PHARMA<br>CORE.
    </h1>
  `
})
export class PharmaBrandComponent {
  @Input() hero = false;
}
