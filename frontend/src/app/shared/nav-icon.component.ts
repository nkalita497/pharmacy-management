import { Component, Input } from '@angular/core';

export type NavIconName =
  | 'dashboard'
  | 'medicines'
  | 'suppliers'
  | 'patients'
  | 'prescriptions'
  | 'sales'
  | 'deliveries'
  | 'audit'
  | 'settings'
  | 'menu'
  | 'sun'
  | 'moon'
  | 'search'
  | 'alert'
  | 'calendar'
  | 'bolt'
  | 'chart'
  | 'cross'
  | 'live';

@Component({
  selector: 'app-nav-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.25"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="shrink-0 text-[#0a0a0a] dark:text-neon-green"
      aria-hidden="true"
    >
      @switch (name) {
        @case ('dashboard') {
          <rect x="3" y="3" width="8" height="8" />
          <rect x="13" y="3" width="8" height="5" />
          <rect x="13" y="10" width="8" height="11" />
          <rect x="3" y="13" width="8" height="8" />
        }
        @case ('medicines') {
          <path d="M8 12h8M12 8v8" />
          <rect x="5" y="3" width="14" height="18" rx="1" />
        }
        @case ('suppliers') {
          <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7v-7z" />
          <circle cx="7.5" cy="18" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="17" cy="18" r="1.5" fill="currentColor" stroke="none" />
        }
        @case ('patients') {
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-4 3.5-6 7-6s7 2 7 6" />
        }
        @case ('prescriptions') {
          <path d="M7 4h10v16H7z" />
          <path d="M10 8h4M10 12h4M10 16h2" />
        }
        @case ('sales') {
          <path d="M6 6h15l-1.5 9H7.5L6 6z" />
          <path d="M6 6L5 3H3" />
          <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
        }
        @case ('deliveries') {
          <path d="M4 7h16v11H4z" />
          <path d="M4 11h16M8 7V4h8v3" />
        }
        @case ('audit') {
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M10 12h4M10 16h4" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        }
        @case ('menu') {
          <path d="M4 7h16M4 12h16M4 17h16" />
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        }
        @case ('moon') {
          <path d="M20 14a8 8 0 11-6-13 10 10 0 006 13z" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="6" />
          <path d="M16 16l5 5" />
        }
        @case ('alert') {
          <path d="M12 4L3 20h18L12 4z" />
          <path d="M12 10v4M12 17h.01" />
        }
        @case ('calendar') {
          <rect x="4" y="5" width="16" height="15" />
          <path d="M4 10h16M8 3v4M16 3v4" />
        }
        @case ('bolt') {
          <path d="M13 2L5 14h6l-1 8 9-12h-6l1-8z" />
        }
        @case ('chart') {
          <path d="M4 20V10M10 20V4M16 20v-6M22 20H2" />
        }
        @case ('cross') {
          <path d="M12 4v16M4 12h16" />
          <rect x="4" y="4" width="16" height="16" rx="1" />
        }
        @case ('live') {
          <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
        }
      }
    </svg>
  `
})
export class NavIconComponent {
  @Input({ required: true }) name!: NavIconName;
  @Input() size = 22;
}
