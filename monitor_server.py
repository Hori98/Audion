#!/usr/bin/env python3
"""
Server Memory and Performance Monitor
Tracks Gunicorn processes to detect memory leaks and performance issues
"""

import psutil
import time
import json
from datetime import datetime
from pathlib import Path
import argparse

def find_gunicorn_processes():
    """Find all Gunicorn processes"""
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_info', 'cpu_percent']):
        try:
            if 'gunicorn' in proc.info['name'] or (
                proc.info['cmdline'] and any('gunicorn' in arg for arg in proc.info['cmdline'])
            ):
                processes.append(proc)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return processes

def get_process_stats(process):
    """Get detailed stats for a process"""
    try:
        memory_info = process.memory_info()
        cpu_percent = process.cpu_percent()
        
        return {
            'pid': process.pid,
            'name': process.name(),
            'memory_mb': round(memory_info.rss / 1024 / 1024, 2),
            'cpu_percent': cpu_percent,
            'status': process.status(),
            'create_time': process.create_time(),
            'num_threads': process.num_threads() if hasattr(process, 'num_threads') else 0
        }
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return None

def monitor_server(interval=60, duration=None, log_file=None):
    """
    Monitor server processes
    
    Args:
        interval: Monitoring interval in seconds (default: 60)
        duration: Total monitoring duration in seconds (default: continuous)
        log_file: Log file path (default: server_monitor.log)
    """
    if log_file is None:
        log_file = Path.cwd() / "server_monitor.log"
    
    print(f"🔍 Starting server monitoring...")
    print(f"📝 Logging to: {log_file}")
    print(f"⏱️  Interval: {interval}s")
    if duration:
        print(f"⏰ Duration: {duration}s")
    print("=" * 50)
    
    start_time = time.time()
    
    with open(log_file, "a") as f:
        f.write(f"\n--- Monitor started at {datetime.now().isoformat()} ---\n")
        
        while True:
            current_time = time.time()
            
            # Check if we should stop
            if duration and (current_time - start_time) >= duration:
                break
                
            processes = find_gunicorn_processes()
            
            if not processes:
                print("⚠️  No Gunicorn processes found")
                f.write(f"{datetime.now().isoformat()}: No Gunicorn processes found\n")
            else:
                total_memory = 0
                total_cpu = 0
                
                print(f"\n📊 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Found {len(processes)} Gunicorn processes:")
                print("-" * 80)
                print(f"{'PID':<8} {'NAME':<15} {'MEM(MB)':<10} {'CPU%':<8} {'STATUS':<10} {'THREADS':<8}")
                print("-" * 80)
                
                log_entry = {
                    'timestamp': datetime.now().isoformat(),
                    'processes': []
                }
                
                for proc in processes:
                    stats = get_process_stats(proc)
                    if stats:
                        print(f"{stats['pid']:<8} {stats['name']:<15} {stats['memory_mb']:<10} {stats['cpu_percent']:<8.1f} {stats['status']:<10} {stats['num_threads']:<8}")
                        total_memory += stats['memory_mb']
                        total_cpu += stats['cpu_percent']
                        log_entry['processes'].append(stats)
                
                print("-" * 80)
                print(f"{'TOTAL':<8} {'':<15} {total_memory:<10.2f} {total_cpu:<8.1f}")
                
                log_entry['total_memory_mb'] = total_memory
                log_entry['total_cpu_percent'] = total_cpu
                
                # Memory leak detection (simple heuristic)
                if total_memory > 500:  # More than 500MB
                    print("🚨 HIGH MEMORY USAGE DETECTED!")
                    log_entry['alert'] = 'HIGH_MEMORY'
                
                if total_cpu > 80:  # More than 80% CPU
                    print("🚨 HIGH CPU USAGE DETECTED!")
                    log_entry['alert'] = log_entry.get('alert', '') + '_HIGH_CPU'
                
                # Write to log file
                f.write(f"{json.dumps(log_entry)}\n")
                f.flush()
            
            print(f"\n⏳ Next check in {interval}s... (Press Ctrl+C to stop)")
            
            try:
                time.sleep(interval)
            except KeyboardInterrupt:
                print("\n\n🛑 Monitoring stopped by user")
                break
    
    print(f"\n📝 Monitor log saved to: {log_file}")

def analyze_log(log_file):
    """Analyze monitoring log for trends"""
    if not Path(log_file).exists():
        print(f"❌ Log file not found: {log_file}")
        return
    
    print(f"📊 Analyzing log: {log_file}")
    
    memory_over_time = []
    cpu_over_time = []
    
    with open(log_file, "r") as f:
        for line in f:
            if line.startswith("{"):
                try:
                    entry = json.loads(line.strip())
                    if 'total_memory_mb' in entry:
                        memory_over_time.append(entry['total_memory_mb'])
                        cpu_over_time.append(entry['total_cpu_percent'])
                except json.JSONDecodeError:
                    continue
    
    if memory_over_time:
        print(f"\n📈 Memory Usage Analysis:")
        print(f"   Min:  {min(memory_over_time):.2f} MB")
        print(f"   Max:  {max(memory_over_time):.2f} MB")
        print(f"   Avg:  {sum(memory_over_time)/len(memory_over_time):.2f} MB")
        
        # Simple trend detection
        if len(memory_over_time) > 1:
            trend = (memory_over_time[-1] - memory_over_time[0]) / len(memory_over_time)
            if trend > 1:
                print(f"🚨 MEMORY LEAK DETECTED: +{trend:.2f} MB per interval")
            elif trend < -1:
                print(f"✅ Memory usage decreasing: {trend:.2f} MB per interval")
            else:
                print(f"✅ Memory usage stable: {trend:.2f} MB per interval")
    
    if cpu_over_time:
        print(f"\n🖥️  CPU Usage Analysis:")
        print(f"   Min:  {min(cpu_over_time):.1f}%")
        print(f"   Max:  {max(cpu_over_time):.1f}%")
        print(f"   Avg:  {sum(cpu_over_time)/len(cpu_over_time):.1f}%")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Monitor Gunicorn server processes')
    parser.add_argument('-i', '--interval', type=int, default=60, 
                       help='Monitoring interval in seconds (default: 60)')
    parser.add_argument('-d', '--duration', type=int, 
                       help='Total monitoring duration in seconds (default: continuous)')
    parser.add_argument('-l', '--log-file', type=str,
                       help='Log file path (default: server_monitor.log)')
    parser.add_argument('--analyze', action='store_true',
                       help='Analyze existing log file instead of monitoring')
    
    args = parser.parse_args()
    
    if args.analyze:
        log_file = args.log_file or "server_monitor.log"
        analyze_log(log_file)
    else:
        monitor_server(
            interval=args.interval,
            duration=args.duration,
            log_file=args.log_file
        )