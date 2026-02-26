import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
import { StorageService } from '../../services/storage.service';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';
import { EChartsOption } from 'echarts';

@Component({
    selector: 'app-latency-chart',
    standalone: true,
    imports: [CommonModule, NgxEchartsDirective],
    providers: [provideEcharts()],
    template: `
    <div echarts [options]="chartOption" class="h-32 w-full"></div>
  `,
    styles: [``]
})
export class LatencyChartComponent implements OnInit, OnDestroy, OnChanges {
    @Input() ip!: string;
    @Input() maxPoints: number = 20;
    chartOption: EChartsOption = {};
    private sub: Subscription = new Subscription();

    constructor(
        private storageService: StorageService,
        private socketService: SocketService
    ) { }

    ngOnInit() {
        this.updateChart();

        this.sub = this.socketService.getPingResults().subscribe(result => {
            if (result.ip === this.ip) {
                this.updateChart();
            }
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['maxPoints'] || changes['ip']) {
            this.updateChart();
        }
    }

    private updateChart() {
        let history = this.storageService.getHistory()[this.ip] || [];

        // Use the provided maxPoints for "zoom" level
        if (history.length > this.maxPoints) {
            history = history.slice(-this.maxPoints);
        }

        const data = history.map(h => h.latency);
        const times = history.map(h => new Date(h.timestamp).toLocaleTimeString());

        this.chartOption = {
            grid: { left: 0, right: 0, top: 10, bottom: 0 },
            xAxis: {
                type: 'category',
                data: times,
                show: false
            },
            yAxis: {
                type: 'value',
                show: false,
                max: (value) => Math.max(100, value.max + 20)
            },
            series: [
                {
                    data: data,
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    areaStyle: {
                        color: 'rgba(59, 130, 246, 0.1)'
                    },
                    lineStyle: {
                        color: '#3b82f6',
                        width: 2
                    }
                }
            ],
            tooltip: {
                trigger: 'axis',
                formatter: '{b}: {c}ms'
            }
        };
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}
