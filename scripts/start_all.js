/**
 * Zkare 프로젝트를 위한 통합 시작 스크립트
 * 이 스크립트는 다음 작업을 순차적으로 수행합니다:
 * 1. 하드햇 로컬 이더리움 네트워크 실행
 * 2. 스마트 컨트랙트 배포
 * 3. 백엔드 및 프론트엔드 실행
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// 환경 변수 체크 - 상세 로그 활성화 여부
const VERBOSE_MODE = process.env.ZKARE_VERBOSE === 'true';

// 색상 코드 (간소화)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

// 로그 래핑 함수 - 간소화된 버전
const log = {
  info: (message) => console.log(`${colors.cyan}[INFO]${colors.reset} ${message}`),
  success: (message) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
  error: (message) => console.log(`${colors.red}[ERROR]${colors.reset} ${message}`),
  // 디버그 메시지는 VERBOSE_MODE가 true일 때만 출력
  debug: (message) => VERBOSE_MODE && console.log(`${colors.yellow}[DEBUG]${colors.reset} ${message}`),
  // 프로세스 출력은 요약된 형태로만 출력
  process: (name, message) => VERBOSE_MODE && 
    console.log(`${colors.magenta}[${name}]${colors.reset} ${message}`),
  // 주요 단계 제목 (더 간결하게)
  title: (message) => {
    console.log(`\n${colors.bright}${colors.cyan}=== ${message} ===${colors.reset}`);
  }
};

// 종료 시 실행할 프로세스 목록
const processesToKill = [];

// 프로세스 이름 추적
const processNames = {};

// SIGINT 핸들러 (Ctrl+C)
process.on('SIGINT', () => {
  log.info('종료 신호를 받았습니다. 모든 프로세스를 종료합니다...');
  
  // 모든 하위 프로세스 종료
  processesToKill.forEach(proc => {
    if (!proc.killed) {
      const name = processNames[proc.pid] || '알 수 없는 프로세스';
      log.debug(`${name} (PID: ${proc.pid}) 종료 중...`);
      proc.kill('SIGINT');
    }
  });
  
  // 몇 초 후 완전히 종료
  setTimeout(() => {
    log.info('프로그램이 종료되었습니다.');
    process.exit(0);
  }, 2000);
});

// 특정 패턴의 로그만 허용하는 필터
const logFilters = {
  'Hardhat Node': [
    // 핵심 정보만 포함
    'Started HTTP and WebSocket JSON-RPC server at',
    'Account #',
    'ERROR'
  ],
  'Contract Deployment': [
    // 배포 관련 핵심 정보
    '✅ ',
    '❌ ',
    'Error:',
    'address:'
  ],
  'Zkare Application': [
    // 앱 시작 관련 정보
    'server',
    'start',
    'listening',
    'running',
    'error',
    'proxy',
    'localhost:' 
  ]
};

/**
 * 로그가 필터를 통과하는지 확인하는 함수
 * @param {string} processName 프로세스 이름
 * @param {string} logLine 로그 한 줄
 * @returns {boolean} 필터 통과 여부
 */
function shouldLogLine(processName, logLine) {
  // VERBOSE_MODE가 true면 모든 로그 출력
  if (VERBOSE_MODE) return true;
  
  // 해당 프로세스에 필터가 없으면 항상 출력 
  if (!logFilters[processName]) return true;
  
  // 필터에 정의된 패턴 중 하나라도 포함되어 있는지 확인
  return logFilters[processName].some(pattern => 
    logLine.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * 명령어를 실행하고 출력을 처리하는 함수
 * @param {string} command 실행할 명령어
 * @param {string} name 프로세스 이름 (로그용)
 * @param {Object} options 실행 옵션
 * @param {boolean} background 백그라운드에서 실행 여부
 * @returns {Promise<any>} 성공 시 resolve, 실패 시 reject
 */
function runCommand(command, name, options = {}, background = false) {
  const { args = [], cwd = process.cwd(), waitForOutput = null } = options;
  
  return new Promise((resolve, reject) => {
    log.info(`${name} 실행 중...`);
    
    // Windows와 Unix 호환되는 방식으로 명령어 처리
    let cmd, cmdArgs;
    if (process.platform === 'win32') {
      cmd = 'cmd.exe';
      cmdArgs = ['/c', command, ...args];
    } else {
      cmd = command;
      cmdArgs = args;
    }
    
    // 프로세스 생성
    const proc = spawn(cmd, cmdArgs, {
      cwd,
      stdio: 'pipe',
      shell: true
    });
    
    // 프로세스 ID 저장
    processNames[proc.pid] = name;
    processesToKill.push(proc);
    
    // 출력 처리 - 필터링 적용
    proc.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        output.split('\n').forEach(line => {
          if (shouldLogLine(name, line)) {
            // 필터를 통과한 로그만 출력
            log.process(name, line);
          }

          // 특정 출력 감지 로직은 그대로 유지
          if (waitForOutput && line.includes(waitForOutput)) {
            log.debug(`${name}에서 필요한 출력을 감지: ${waitForOutput}`);
            resolve({ success: true, message: `${name} 실행 완료`, process: proc });
          }
        });
      }
    });
    
    // 오류 출력은 항상 표시하도록 유지
    proc.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        output.split('\n').forEach(line => {
          // 에러는 항상 출력하되, 일부 알려진 비-에러 메시지는 필터링
          if (!line.includes('Compiled successfully') && !line.includes('0 errors')) {
            log.process(name, `${colors.red}${line}${colors.reset}`);
          }
        });
      }
    });
    
    proc.on('close', (code) => {
      if (code !== 0 && !background) {
        log.error(`${name} 실행 실패 (종료 코드: ${code})`);
        reject({ success: false, message: `${name} 실행 실패 (종료 코드: ${code})` });
      } else if (!background) {
        log.success(`${name} 실행 완료`);
        resolve({ success: true, message: `${name} 실행 완료`, process: proc });
      }
    });
    
    proc.on('error', (err) => {
      log.error(`${name} 실행 오류: ${err.message}`);
      reject({ success: false, message: `${name} 실행 오류: ${err.message}` });
    });
    
    // 백그라운드 실행인 경우 프로세스가 시작되면 즉시 해결
    if (background && waitForOutput === null) {
      log.debug(`${name} 백그라운드에서 실행 중 (PID: ${proc.pid})`);
      resolve({ success: true, message: `${name} 백그라운드에서 실행 중`, process: proc });
    }
  });
}

/**
 * 메인 함수 - 전체 실행 로직
 */
async function main() {
  try {
    log.title('Zkare 시작 중');
    console.log('(상세 로그를 보려면 ZKARE_VERBOSE=true 환경변수를 설정하세요)\n');
    
    // 1. 하드햇 노드 실행 (백그라운드)
    log.title('로컬 이더리움 네트워크 시작');
    const hardhatNode = await runCommand('npx', 'Hardhat Node', {
      args: ['hardhat', 'node'],
      waitForOutput: 'Started HTTP and WebSocket JSON-RPC server at'
    }, true);
    
    // 네트워크가 시작될 때까지 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 2. 컨트랙트 배포
    log.title('스마트 컨트랙트 배포');
    await runCommand('npm', 'Contract Deployment', {
      args: ['run', 'deploy']
    });
    
    // 3. 백엔드 및 프론트엔드 동시 실행
    log.title('애플리케이션 서버 시작');
    
    // 백엔드와 프론트엔드를 동시에 실행하는 npm 스크립트 실행
    await runCommand('npm', 'Zkare Application', {
      args: ['run', 'dev'],
      waitForOutput: 'proxying'
    }, true);
    
    log.title('Zkare 애플리케이션 실행 완료');
    log.info('백엔드 서버: http://localhost:5001');
    log.info('프론트엔드: http://localhost:3000');
    log.info('이더리움 노드: http://localhost:8545');
    log.info('\n애플리케이션을 종료하려면 Ctrl+C를 누르세요.');
    
    // 사용자 입력 대기 (프로그램이 종료되지 않도록)
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.on('line', (input) => {
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        log.info('사용자 요청으로 프로그램을 종료합니다...');
        process.emit('SIGINT');
      }
    });
  } catch (error) {
    log.error(`오류 발생: ${error.message || JSON.stringify(error)}`);
    console.error(error);
    
    // 오류 발생 시 모든 프로세스 종료
    processesToKill.forEach(proc => {
      if (!proc.killed) {
        const name = processNames[proc.pid] || '알 수 없는 프로세스';
        log.debug(`${name} (PID: ${proc.pid}) 종료 중...`);
        proc.kill('SIGINT');
      }
    });
    
    process.exit(1);
  }
}

// 스크립트 실행
main(); 