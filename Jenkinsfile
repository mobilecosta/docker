def getGitBranchName() {
    return scm.branches[0].name
}
node { 
    stage('Prepare Mib'){
        getGitBranchName()
        script {
            echo "BRANCH_NAME"
            echo "$BRANCH_NAME"
            echo "${BRANCH_NAME}"
        }    
    }
}

// pipeline {
//     agent {
//         docker {
//             image 'serverlessimg:1'
//             args '-p 3000:3000' 
//         }
//     }
//     stages {
//         stage('Preparing') {
//             steps {
//                 //notify
//                 // TODO - Usar aqui um meio de esconder essas chaves 
//                 // TODO - Criar chaves de acesso para o usuário Jenkins
//                 sh 'serverless config credentials --provider aws --key AKIA3MCGHZBN3GLUP3YE --secret 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'
//             }
//         }
//         stage('Build') { 
//             steps {
//                 git branch: 'feature/deploy', url: 'ssh://tfs2015.totvs.com.br:22/tfs/TDITOTVS12/MPN/_git/mpn_servicos'
//                 sh 'rm -rf .build'
//                 sh 'npm install' 
//                 sh 'sls package --stage dev --build ${BUILD_NUMBER} -v'
//                 sh './build/check_packages.sh'
                
//                 //DEV RUNTIME    
//                 sh 'cat LAST_ALL_PACKAGES'
//                 sh 'cat BUILD_${BUILD_NUMBER}'
//                 sh 'cat ALL_PACKAGES'                                
//             }
//         }
//         stage('Deploy') {
//             steps {
//                 //notify
//                 sh './build/deploy_packages.sh'
                
//             }
//         }
//     }
        
// }