#!/bin/sh

# set -x

deploy=$(cat DEPLOY)

#Reads the file with the hashes, get its name and call other function to deploy
get_function_to_deploy() {
  if [ -f BUILD_${BUILD_NUMBER} ]
    then
      functions=$(cat BUILD_${BUILD_NUMBER})
      for function in $functions 
        do
          deploy_function $function
      done
  else
    echo ">>> There's no BUILD_FILE with number ${BUILD_NUMBER} "
  fi
}

#Deploy all packages. It runs if it is first deploy.
deploy_all() {
  echo ">>> Deploying all packages..."
  sls deploy --stage ${STAGE} --build ${BUILD_NUMBER} --aws-s3-accelerate
}

#Deploy each function separatedly
deploy_function() {
  echo ">>> Deploying package $1 ..."
  sls deploy --function -f $1 --stage ${STAGE} --build ${BUILD_NUMBER} --aws-s3-accelerate
}  

#For each function deployed, writes a line in log file.
write_log() {
  #TODO - Confirmar se o deploy da função rolou antes de escrever o LAST. De repente, na hora de deployar cada função, eu checo se rolou e se rolar, gero um arquivo para validação.
  #TODO - Incrementar a função pra incluir data e hora 
  echo $1 $2 >> BUILD_${BUILD_NUMBER}.log
}

#Move file with hashes to generate a file to be used on next run
register_deploy() {
  #TODO  mover somente caso o deploy dê sucesso em tudo 
  # caso uma lambda de erro, ele não move o arquivo e não termina com sucesso
  # De repente, na hora de deployar cada função, eu checo se rolou e se rolar, gero um arquivo para validação.
  echo ">>> Registering current deploy..."
  if [ ${deploy} = full ]
    then 
      mv ALL_PACKAGES FIRST_DEPLOY && cp -rp FIRST_DEPLOY LAST_ALL_PACKAGES
    else 
      mv ALL_PACKAGES LAST_ALL_PACKAGES
  fi   
}


if [ ${deploy} = "full" ]
  then
    deploy_all
    register_deploy
elif [ ${deploy} = "partial" ]
  then
    get_function_to_deploy
    register_deploy
  else
    echo ">>> There's no Lambda to update..."
fi
