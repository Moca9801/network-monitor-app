import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    private socket: Socket;
    private backendUrl = 'http://localhost:3000';

    private targetsSubject = new BehaviorSubject<any[]>([]);
    targets$ = this.targetsSubject.asObservable();

    constructor() {
        this.socket = io(this.backendUrl);

        this.socket.on('initial-targets', (targets: any[]) => {
            this.targetsSubject.next(targets);
        });
    }

    getPingResults(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('ping-result', (data: any) => {
                observer.next(data);
            });
        });
    }
}
