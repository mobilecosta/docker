#!/bin/sh
# set -x

#Check if .serverless directory exists
check_directory() {

    directory=$(ls .serverless)  

    if [ -z ${directory} ] 
    then
        echo ">>> Directory .serverless doesn't exist. Exiting..."
        exit 1
    else
        echo ">>> Found some functions to update. Let's do it..."
    fi
} 

#General package command. This command will re-create all zipped functions. 
#If the function had been changed, it will have a different md5 hash
package() {
    sls package --stage ${STAGE} --build ${BUILD_NUMBER} -v
}

#Generates a file with a hash of each function
packages_md5() {
    sls_path=".serverless"
    echo ">>> Generating All Packages file containing all functions and its MD5 hashes..."
    find ${sls_path} -type f -iname '*.zip' -exec "md5sum" {} \; > ALL_PACKAGES
}

#Compare all md5sum hashes with last and the very first deploy file.
# If it has differences, deploy full or partially. 
compare_md5() {
    echo ">>> Comparing MD5 to define build file..."
    if [ ! -f FIRST_DEPLOY ]
        then
          echo "full" > DEPLOY
    else
        echo "partial" > DEPLOY 
        while IFS= read -r line                                                                                                                                                  
        do                                                                                                                                                                   
            current_function_name=$(echo ${line} | awk -F/ '{print $2}')
            current_function_md5=$(echo ${line} | awk '{print $1}')
            last_function_md5=$(awk /$current_function_name/ LAST_ALL_PACKAGES | awk '{print $1}')                                                                              

            if [[ ! -z $(awk -v function_to_search="$current_function_name" -F/ '$0~function_to_search{print $2}' LAST_ALL_PACKAGES) ]]                                                                                                          
                then                                                                                  
                    if [[ $current_function_md5 = $last_function_md5 ]]
                    then                                                                                                                                                          
                        echo ">>> $current_function_name hasn't been changed"                                                                                                            
                    else
                        echo ">>> $current_function_name has been changed. Marking to deploy..."                                                                                                                      
                        function_to_deploy=$(echo $current_function_name | rev | cut -d. -f2 | rev)                                                                                
                        echo $function_to_deploy >> BUILD_${BUILD_NUMBER}                                                                                                                    
                    fi                                                                                                                                                              
                else                                                                                                                                                              
                    if [[ $(awk -v function_to_search="$current_function_name" -F/ '$0~function_to_search{print $2}' FIRST_DEPLOY ) ]]                                                                                                          
                    then                                                                                                                                                          
                        first_function_md5=$(awk /$current_function_name/ FIRST_DEPLOY | awk '{print $1}')                                                                          
                        if [[ $current_function_md5 = $first_function_md5 ]]                                                                                                        
                        then                                                                                                                                                      
                        echo ">>> $current_function_name hasn't been changed"
                        else                                                                                                                                                        
                        echo ">>> $current_function_name has been changed. Marking to deploy..."
                        function_to_deploy=$(echo $current_function_name | rev | cut -d. -f2 | rev)                                                                               
                        echo $function_to_deploy >> BUILD_${BUILD_NUMBER}                                                                                                                   
                        fi                                                                                                                                                          
                    else                                                                                                                                                          
                        echo ">>> New function added  $current_function_name"                                                                                                                   
                        function_to_deploy=$(echo $current_function_name | rev | cut -d. -f2 | rev)                                                                                 
                        echo $function_to_deploy >> BUILD_${BUILD_NUMBER}                                                                                                                     
                    fi                                                                                                                                                              
                fi                                                                                                                                                                  
        done < "ALL_PACKAGES"
    fi
}

main() {
    if [ check_directory ] 
        then
            package
            packages_md5
            compare_md5
        else
            echo ">>> Directory .serverless doesn't exist. Exiting..."
    fi
}

main