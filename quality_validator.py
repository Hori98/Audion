#!/usr/bin/env python3
"""
AI開発品質保証自動検証スクリプト
- 実装・変更・修正時の品質チェックを機械的に実行
- 今回の「APIパス重複」問題のような事象を事前検出・防止
"""

import os
import re
import json
import subprocess
import asyncio
from pathlib import Path
from typing import List, Dict, Set, Tuple, Optional
import requests
from dataclasses import dataclass

@dataclass
class ValidationResult:
    """検証結果"""
    category: str
    item: str
    status: bool
    message: str
    severity: str  # 'critical', 'warning', 'info'

class QualityValidator:
    """品質検証の統合クラス"""
    
    def __init__(self, project_root: str):
        self.root = Path(project_root)
        self.backend_dir = self.root / "backend"
        self.frontend_dir = self.root / "audion-app"
        self.results: List[ValidationResult] = []
    
    def add_result(self, category: str, item: str, status: bool, message: str, severity: str = 'warning'):
        """検証結果を追加"""
        self.results.append(ValidationResult(category, item, status, message, severity))
    
    # ==================== 1. ルーティング・エンドポイント関連 ====================
    
    def validate_api_path_consistency(self) -> bool:
        """APIパス整合性の検証（今回の問題の防止）"""
        print("🔍 APIパス整合性検証中...")
        
        # バックエンドのエンドポイント抽出
        backend_endpoints = self._extract_backend_endpoints()
        
        # フロントエンドのAPI呼び出し抽出
        frontend_api_calls = self._extract_frontend_api_calls()
        
        # 1. パス重複チェック（/api/api/ パターン）
        duplicate_paths = [path for path in backend_endpoints if '/api/api/' in path]
        if duplicate_paths:
            self.add_result("routing", "path_duplication", False, 
                          f"APIパス重複検出: {duplicate_paths}", "critical")
            return False
        
        # 2. フロントエンド・バックエンド不整合チェック
        missing_endpoints = set(frontend_api_calls) - set(backend_endpoints)
        if missing_endpoints:
            self.add_result("routing", "endpoint_mismatch", False,
                          f"未実装エンドポイント: {missing_endpoints}", "critical")
            return False
        
        # 3. BASE_URL + エンドポイントパス結合チェック
        base_url_issues = self._check_base_url_consistency()
        if base_url_issues:
            self.add_result("routing", "base_url_inconsistency", False,
                          f"BASE_URL問題: {base_url_issues}", "critical")
            return False
        
        self.add_result("routing", "path_consistency", True, "APIパス整合性: OK", "info")
        return True
    
    def _extract_backend_endpoints(self) -> Set[str]:
        """バックエンドからエンドポイントを抽出"""
        endpoints = set()
        
        # server.py から抽出
        server_py = self.backend_dir / "server.py"
        if server_py.exists():
            content = server_py.read_text()
            # @app.get, @app.post, @router.get, @router.post 等を検出
            patterns = [
                r'@app\.(get|post|put|delete)\(["\']([^"\']+)["\']',
                r'@router\.(get|post|put|delete)\(["\']([^"\']+)["\']'
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, content)
                for method, path in matches:
                    endpoints.add(path)
        
        # routers/ ディレクトリからも抽出
        routers_dir = self.backend_dir / "routers"
        if routers_dir.exists():
            for router_file in routers_dir.glob("*.py"):
                content = router_file.read_text()
                pattern = r'@router\.(get|post|put|delete)\(["\']([^"\']+)["\']'
                matches = re.findall(pattern, content)
                for method, path in matches:
                    endpoints.add(path)
        
        return endpoints
    
    def _extract_frontend_api_calls(self) -> Set[str]:
        """フロントエンドからAPI呼び出しを抽出"""
        api_calls = set()
        
        # API設定ファイルから抽出
        api_config = self.frontend_dir / "config" / "api.ts"
        if api_config.exists():
            content = api_config.read_text()
            # API_ENDPOINTS の定義を抽出
            pattern = r'["\']([^"\']*\/[^"\']*)["\']'
            matches = re.findall(pattern, content)
            api_calls.update(matches)
        
        # AuthService等のAPIクライアントから抽出
        services_dir = self.frontend_dir / "services"
        if services_dir.exists():
            for service_file in services_dir.glob("*.ts"):
                content = service_file.read_text()
                # apiClient.post, apiClient.get 等の呼び出しを検出
                patterns = [
                    r'apiClient\.(get|post|put|delete)\(\s*["\']([^"\']+)["\']',
                    r'API_ENDPOINTS\.[\w.]+["\']([^"\']+)["\']'
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, content)
                    for match in matches:
                        if isinstance(match, tuple):
                            api_calls.add(match[1] if len(match) > 1 else match[0])
                        else:
                            api_calls.add(match)
        
        return api_calls
    
    def _check_base_url_consistency(self) -> List[str]:
        """BASE_URLとエンドポイントパスの整合性チェック"""
        issues = []
        
        api_config = self.frontend_dir / "config" / "api.ts"
        if not api_config.exists():
            return ["api.ts ファイルが見つかりません"]
        
        content = api_config.read_text()
        
        # BASE_URLにapiが含まれているかチェック
        base_url_match = re.search(r'BASE_URL.*["\']([^"\']*)["\']', content)
        if base_url_match:
            base_url = base_url_match.group(1)
            if base_url.endswith('/api'):
                # エンドポイントパスが/apiで始まっていないかチェック
                if '/api/' in content and not content.count('/api/') == content.count('BASE_URL'):
                    issues.append("BASE_URLが/apiで終わっているが、エンドポイントパスに/api/が含まれている")
        
        return issues
    
    # ==================== 2. データフロー・通信関連 ====================
    
    def validate_data_flow(self) -> bool:
        """データフロー・通信の検証"""
        print("🌊 データフロー検証中...")
        
        success = True
        
        # CORS設定チェック
        if not self._check_cors_configuration():
            success = False
        
        # 環境変数によるDB接続設定チェック
        if not self._check_database_configuration():
            success = False
        
        return success
    
    def _check_cors_configuration(self) -> bool:
        """CORS設定の確認"""
        server_py = self.backend_dir / "server.py"
        if not server_py.exists():
            self.add_result("dataflow", "cors_config", False, "server.py が見つかりません", "critical")
            return False
        
        content = server_py.read_text()
        
        if 'CORSMiddleware' not in content:
            self.add_result("dataflow", "cors_config", False, "CORSMiddleware の設定がありません", "critical")
            return False
        
        # 開発環境用の設定があるかチェック
        if 'allow_origins' not in content:
            self.add_result("dataflow", "cors_config", False, "allow_origins の設定がありません", "warning")
            return False
        
        self.add_result("dataflow", "cors_config", True, "CORS設定: OK", "info")
        return True
    
    def _check_database_configuration(self) -> bool:
        """データベース設定の確認"""
        env_file = self.backend_dir / ".env"
        if not env_file.exists():
            self.add_result("dataflow", "db_config", False, ".env ファイルがありません", "critical")
            return False
        
        env_content = env_file.read_text()
        
        required_vars = ['MONGO_URL', 'DB_NAME']
        missing_vars = [var for var in required_vars if var not in env_content]
        
        if missing_vars:
            self.add_result("dataflow", "db_config", False,
                          f"必須DB環境変数が不足: {missing_vars}", "critical")
            return False
        
        self.add_result("dataflow", "db_config", True, "データベース設定: OK", "info")
        return True
    
    # ==================== 3. 環境・設定関連 ====================
    
    def validate_environment_config(self) -> bool:
        """環境・設定の検証"""
        print("⚙️ 環境設定検証中...")
        
        success = True
        
        # .env と .env.example の同期チェック
        if not self._check_env_file_sync():
            success = False
        
        # 依存関係の整合性チェック
        if not self._check_dependency_integrity():
            success = False
        
        return success
    
    def _check_env_file_sync(self) -> bool:
        """環境変数ファイルの同期チェック"""
        env_file = self.backend_dir / ".env"
        env_example = self.backend_dir / ".env.example"
        
        if not env_example.exists():
            self.add_result("environment", "env_sync", False,
                          ".env.example ファイルがありません", "warning")
            return False
        
        if env_file.exists():
            env_vars = self._extract_env_variables(env_file)
            example_vars = self._extract_env_variables(env_example)
            
            missing_in_example = env_vars - example_vars
            if missing_in_example:
                self.add_result("environment", "env_sync", False,
                              f".env.example に不足: {missing_in_example}", "warning")
                return False
        
        self.add_result("environment", "env_sync", True, "環境変数ファイル同期: OK", "info")
        return True
    
    def _extract_env_variables(self, env_file: Path) -> Set[str]:
        """環境変数ファイルから変数名を抽出"""
        variables = set()
        content = env_file.read_text()
        
        for line in content.split('\n'):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                var_name = line.split('=')[0].strip()
                variables.add(var_name)
        
        return variables
    
    def _check_dependency_integrity(self) -> bool:
        """依存関係の整合性チェック"""
        success = True
        
        # Python 依存関係チェック（requirements.txt または poetry.lock）
        requirements_txt = self.backend_dir / "requirements.txt"
        poetry_lock = self.backend_dir / "poetry.lock"
        
        if not requirements_txt.exists() and not poetry_lock.exists():
            self.add_result("environment", "dependency_integrity", False,
                          "Python依存関係ファイル (requirements.txt または poetry.lock) がありません", "critical")
            success = False
        else:
            if requirements_txt.exists():
                self.add_result("environment", "dependency_integrity", True,
                              "Python依存関係: requirements.txt OK", "info")
            elif poetry_lock.exists():
                self.add_result("environment", "dependency_integrity", True,
                              "Python依存関係: poetry.lock OK", "info")
        
        # Node.js (npm)
        package_lock = self.frontend_dir / "package-lock.json"
        if not package_lock.exists():
            self.add_result("environment", "dependency_integrity", False,
                          "package-lock.json ファイルがありません", "critical")
            success = False
        else:
            self.add_result("environment", "dependency_integrity", True,
                          "Node.js依存関係: package-lock.json OK", "info")
        
        return success
    
    # ==================== 4. テスト・検証関連 ====================
    
    def validate_test_coverage(self) -> bool:
        """テストカバレッジの検証"""
        print("🧪 テストカバレッジ検証中...")
        
        # バックエンドのテストカバレッジチェック
        if not self._check_backend_test_coverage():
            return False
        
        # フロントエンドの型チェック
        if not self._check_frontend_type_safety():
            return False
        
        return True
    
    def _check_backend_test_coverage(self) -> bool:
        """バックエンドのテストカバレッジチェック"""
        tests_dir = self.backend_dir / "tests"
        if not tests_dir.exists():
            self.add_result("testing", "test_coverage", False,
                          "tests ディレクトリがありません", "warning")
            return False
        
        # pytest の実行
        try:
            result = subprocess.run([
                'python', '-m', 'pytest', '--cov=.', '--cov-report=json', 'tests/'
            ], cwd=self.backend_dir, capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                self.add_result("testing", "test_coverage", False,
                              f"テスト実行失敗: {result.stderr}", "warning")
                return False
            
            # カバレッジファイルが生成されているかチェック
            coverage_file = self.backend_dir / "coverage.json"
            if coverage_file.exists():
                coverage_data = json.loads(coverage_file.read_text())
                total_coverage = coverage_data.get('totals', {}).get('percent_covered', 0)
                
                if total_coverage < 70:  # 70%以下は警告
                    self.add_result("testing", "test_coverage", False,
                                  f"カバレッジ低下: {total_coverage:.1f}%", "warning")
                    return False
                
                self.add_result("testing", "test_coverage", True,
                              f"テストカバレッジ: {total_coverage:.1f}%", "info")
                return True
        
        except subprocess.TimeoutExpired:
            self.add_result("testing", "test_coverage", False,
                          "テスト実行がタイムアウトしました", "warning")
            return False
        except Exception as e:
            self.add_result("testing", "test_coverage", False,
                          f"テスト実行エラー: {str(e)}", "warning")
            return False
        
        return False
    
    def _check_frontend_type_safety(self) -> bool:
        """フロントエンドの型安全性チェック"""
        try:
            result = subprocess.run([
                'npx', 'tsc', '--noEmit'
            ], cwd=self.frontend_dir, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                self.add_result("testing", "type_safety", False,
                              f"TypeScript型エラー: {result.stdout}", "warning")
                return False
            
            self.add_result("testing", "type_safety", True,
                          "TypeScript型チェック: OK", "info")
            return True
        
        except subprocess.TimeoutExpired:
            self.add_result("testing", "type_safety", False,
                          "TypeScript型チェックがタイムアウトしました", "warning")
            return False
        except Exception as e:
            self.add_result("testing", "type_safety", False,
                          f"TypeScript型チェックエラー: {str(e)}", "warning")
            return False
    
    # ==================== 5. AIガードレール・影響範囲分析 ====================
    
    def validate_ai_guardrails(self) -> bool:
        """CLAUDE.mdのAIガードレールに違反していないか検証"""
        print("🛡️ AIガードレール検証中...")
        success = True
        
        # git diff を使って変更されたファイルを取得
        try:
            changed_files = subprocess.check_output(
                ['git', 'diff', '--name-only', 'HEAD~1', 'HEAD'],
                cwd=self.root, text=True
            ).splitlines()
        except Exception:
            # 変更がない場合や初回コミットの場合
            try:
                changed_files = subprocess.check_output(
                    ['git', 'diff', '--staged', '--name-only'],
                    cwd=self.root, text=True
                ).splitlines()
            except Exception:
                self.add_result("guardrails", "git_diff", True,
                              "変更されたファイルがありません", "info")
                return True

        if not changed_files:
            self.add_result("guardrails", "change_analysis", True,
                          "変更されたファイルがありません", "info")
            return True
            
        # 1. 修正禁止範囲の変更をチェック
        forbidden_patterns = [
            "package.json",                    # 依存関係変更
            "requirements.txt",               # Python依存関係（現在使用中）
            "poetry.lock",                    # Python依存関係（未使用だが保護）
            "backend/auth/",                  # 認証ロジック（存在する場合）
            "audion-app/context/AuthContext.tsx", # 認証コンテキスト  
            ".env",                          # 環境変数
            "docker-compose.yml",            # デプロイ設定
            "tests/"                         # テスト削除防止
        ]
        
        forbidden_changes = []
        for file_path in changed_files:
            if any(pattern in file_path for pattern in forbidden_patterns):
                forbidden_changes.append(file_path)
        
        if forbidden_changes:
            self.add_result("guardrails", "forbidden_change", False,
                          f"修正禁止ファイルへの変更を検出: {', '.join(forbidden_changes)}", "critical")
            success = False
        
        # 2. API破壊的変更の検知
        api_breaking_changes = []
        for file_path in changed_files:
            if 'server.py' in file_path or 'routers/' in file_path:
                # FastAPIエンドポイントの変更を検知
                try:
                    diff_result = subprocess.check_output(
                        ['git', 'diff', 'HEAD~1', 'HEAD', '--', file_path],
                        cwd=self.root, text=True
                    )
                    
                    # エンドポイント削除の検知（簡易版）
                    if '-@app.' in diff_result or '-@router.' in diff_result:
                        api_breaking_changes.append(file_path)
                        
                except Exception:
                    pass
        
        if api_breaking_changes:
            self.add_result("guardrails", "api_breaking_change", False,
                          f"API破壊的変更の可能性: {', '.join(api_breaking_changes)}", "critical")
            success = False
        
        # 3. 影響範囲分析の実行
        self._analyze_impact_radius(changed_files)
        
        if success:
            self.add_result("guardrails", "change_analysis", True,
                          f"影響範囲分析完了: {len(changed_files)}個のファイルが変更されました", "info")
        
        return success
    
    def _analyze_impact_radius(self, changed_files: list) -> None:
        """影響範囲分析を実行"""
        print("🔍 影響範囲分析実行中...")
        
        impact_summary = []
        
        for file_path in changed_files:
            if not os.path.exists(os.path.join(self.root, file_path)):
                continue
                
            # ファイル内で変更された関数・クラスを特定（簡易版）
            try:
                with open(os.path.join(self.root, file_path), 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # 関数・クラス定義を検索
                import re
                functions = re.findall(r'(?:def|function|class|interface)\s+(\w+)', content)
                
                if functions:
                    # 各関数・クラスが他のファイルで使用されているか検査
                    for symbol in functions[:3]:  # 最大3個まで
                        references = self._find_symbol_references(symbol, file_path)
                        if references:
                            impact_summary.append(f"{symbol} in {file_path}: {len(references)}箇所で参照")
                            
            except Exception:
                pass
        
        if impact_summary:
            self.add_result("guardrails", "impact_radius", True,
                          f"影響範囲: {'; '.join(impact_summary[:5])}", "info")
        else:
            self.add_result("guardrails", "impact_radius", True,
                          "影響範囲: 局所的変更のみ", "info")
    
    def _find_symbol_references(self, symbol: str, exclude_file: str) -> list:
        """シンボルの参照箇所を検索"""
        try:
            # grepを使用してシンボルの参照を検索
            result = subprocess.check_output([
                'grep', '-r', symbol, '--include=*.py', '--include=*.ts', 
                '--include=*.tsx', '--exclude-dir=node_modules', 
                '--exclude-dir=.git', '.'
            ], cwd=self.root, text=True)
            
            references = result.strip().split('\n')
            # 除外ファイル以外の参照のみを返す
            return [ref for ref in references if exclude_file not in ref and ref.strip()]
            
        except subprocess.CalledProcessError:
            return []
        except Exception:
            return []
    
    # ==================== 統合実行 ====================
    
    async def run_full_validation(self) -> bool:
        """完全な品質検証を実行"""
        print("🎯 AI開発品質保証チェック開始\n" + "="*50)
        
        validation_tasks = [
            ("ルーティング・エンドポイント", self.validate_api_path_consistency),
            ("データフロー・通信", self.validate_data_flow),  
            ("環境・設定", self.validate_environment_config),
            ("テスト・検証", self.validate_test_coverage),
            ("AIガードレール・影響範囲分析", self.validate_ai_guardrails)
        ]
        
        overall_success = True
        
        for category_name, validation_func in validation_tasks:
            print(f"\n📋 {category_name} 検証中...")
            try:
                success = validation_func()
                if not success:
                    overall_success = False
            except Exception as e:
                print(f"❌ {category_name} 検証中にエラー: {str(e)}")
                overall_success = False
        
        # 結果サマリー表示
        self._print_results_summary()
        
        return overall_success
    
    def _print_results_summary(self):
        """検証結果のサマリーを表示"""
        print("\n" + "="*50)
        print("🏁 品質検証結果サマリー")
        print("="*50)
        
        critical_issues = [r for r in self.results if r.severity == 'critical' and not r.status]
        warning_issues = [r for r in self.results if r.severity == 'warning' and not r.status]
        success_count = len([r for r in self.results if r.status])
        
        if critical_issues:
            print(f"\n❌ CRITICAL問題: {len(critical_issues)}件")
            for issue in critical_issues:
                print(f"  - [{issue.category}] {issue.item}: {issue.message}")
        
        if warning_issues:
            print(f"\n⚠️  WARNING: {len(warning_issues)}件")
            for issue in warning_issues:
                print(f"  - [{issue.category}] {issue.item}: {issue.message}")
        
        print(f"\n✅ 成功項目: {success_count}件")
        
        if not critical_issues and not warning_issues:
            print("\n🎉 全項目パス - 品質基準を満たしています！")
        elif not critical_issues:
            print("\n✅ CRITICAL問題なし - デプロイ可能です")
        else:
            print("\n🚫 CRITICAL問題あり - 修正が必要です")


def main():
    """メイン実行関数"""
    import sys
    
    # プロジェクトルートを取得
    project_root = os.getcwd()
    
    print("🚀 AI開発品質保証システム")
    print("="*50)
    print(f"プロジェクトルート: {project_root}")
    
    # 検証実行
    validator = QualityValidator(project_root)
    
    # 非同期実行
    success = asyncio.run(validator.run_full_validation())
    
    # 終了コード設定
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()