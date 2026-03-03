$file = "frontend\src\app\components\dashboard\dashboard.component.html"
$lines = [System.IO.File]::ReadAllLines($file)
$total = $lines.Length
Write-Host "Total lines: $total"

# Keep lines 1-149 (0-based: 0-148) and 245+ (0-based: 244+)
$before = $lines[0..148]
$after  = $lines[244..($total-1)]

$newCard = @"
          <div cdkDropList (cdkDropListDropped)="onDrop(`$event)" class="space-y-2">

            <div *ngFor="let target of getTargetsByCategoryAndType(sede, type)"
              cdkDrag (click)="openDetails(target)"
              class="group relative flex items-center bg-card border border-theme rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-slate-600/60 hover:bg-[rgba(255,255,255,0.02)]">

              <!-- Left status strip -->
              <div class="absolute left-0 top-0 bottom-0 w-[3px]"
                [ngClass]="target.alive ? 'bg-blue-500' : 'bg-red-500'">
              </div>

              <!-- Card single row -->
              <div class="flex items-center w-full pl-5 pr-3 py-[14px] md:pl-6 md:pr-4 md:py-4 gap-3 md:gap-5">

                <!-- Status dot -->
                <div class="relative flex-shrink-0">
                  <div class="w-2 h-2 rounded-full"
                    [ngClass]="target.alive ? 'bg-blue-400' : 'bg-red-500'"
                    [style.box-shadow]="target.alive ? '0 0 6px rgba(96,165,250,0.9)' : '0 0 6px rgba(239,68,68,0.9)'">
                  </div>
                  <div *ngIf="target.alive" class="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-50"></div>
                </div>

                <!-- Name + IP -->
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-[13px] md:text-sm text-main tracking-tight truncate">{{ target.name }}</p>
                  <p class="font-mono text-[9px] text-muted opacity-40 tracking-wider uppercase mt-0.5">{{ target.ip }}</p>
                </div>

                <!-- Stats: desktop -->
                <div class="hidden md:flex items-center divide-x divide-white/[0.05]">
                  <div class="flex flex-col items-end pr-5">
                    <span class="text-[9px] font-semibold uppercase tracking-widest text-muted opacity-40 leading-none mb-1">RTT</span>
                    <span class="text-sm font-black tabular-nums leading-none"
                      [ngClass]="target.latency > 100 ? 'text-amber-400' : 'text-main'">
                      {{ target.latency }}<span class="text-[9px] font-medium opacity-40 ml-0.5">ms</span>
                    </span>
                  </div>
                  <div class="flex flex-col items-end px-5">
                    <span class="text-[9px] font-semibold uppercase tracking-widest text-muted opacity-40 leading-none mb-1">PPL</span>
                    <span class="text-sm font-black tabular-nums leading-none"
                      [ngClass]="target.stats?.ppl > 0 ? 'text-red-400' : 'text-blue-400'">
                      {{ target.stats?.ppl }}<span class="text-[9px] font-medium opacity-40 ml-0.5">%</span>
                    </span>
                  </div>
                  <div class="pl-5">
                    <span class="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border"
                      [ngClass]="target.alive ? 'text-blue-400 border-blue-500/25 bg-blue-500/[0.08]' : 'text-red-400 border-red-500/25 bg-red-500/[0.08]'">
                      <span class="w-1.5 h-1.5 rounded-full" [ngClass]="target.alive ? 'bg-blue-400' : 'bg-red-500'"></span>
                      {{ target.alive ? 'Online' : 'Offline' }}
                    </span>
                  </div>
                </div>

                <!-- Stats: mobile -->
                <div class="flex md:hidden items-center gap-1.5 flex-shrink-0 text-[10px] font-black tabular-nums">
                  <span class="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.05]"
                    [ngClass]="target.latency > 100 ? 'text-amber-400' : 'text-main'">
                    {{ target.latency }}<span class="opacity-40 text-[8px]">ms</span>
                  </span>
                  <span class="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.05]"
                    [ngClass]="target.stats?.ppl > 0 ? 'text-red-400' : 'text-blue-400'">
                    {{ target.stats?.ppl }}<span class="opacity-40 text-[8px]">%</span>
                  </span>
                </div>

                <!-- Actions -->
                <div class="flex flex-shrink-0 items-center gap-1 ml-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">
                  <button (click)="openEdit(target); `$event.stopPropagation()" title="Editar"
                    class="p-2 rounded-xl text-muted/50 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button (click)="removeServer(target.id); `$event.stopPropagation()" title="Eliminar"
                    class="p-2 rounded-xl text-muted/50 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

              </div>
            </div>

            <!-- Drag placeholder -->
"@

$newCardLines = $newCard -split "`n"
$combined = $before + $newCardLines + $after
[System.IO.File]::WriteAllLines($file, $combined, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. New total lines: $($combined.Length)"
