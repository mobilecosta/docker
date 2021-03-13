module.exports = () => {  
  const fs = require('fs')
  const files = fs.readdirSync('src/modules/')
  const YAML = require('yamljs')  

  const merged = files
      .map((f) => {
        const pack = {endpoint: '', path: f}
        const filePath = `src/modules/${f}/_platform/endpoint.yml`
        try{
          pack.endpoint = fs.readFileSync(filePath, 'utf8')
          return pack
        } catch (e) {
          return pack
        }
      })
      .map((pack) => {
        try{
          const filePath = `src/modules/${pack.path}/_platform/functions.yml`
          pack.functions = fs.readFileSync(filePath, 'utf8')
          return pack
        } catch (e) {
          pack.functions = ''
          return pack
        }
      })
      .map(pack => YAML.parse(pack.endpoint + pack.functions))
      .reduce( (result, handler) => Object.assign(result, handler), {})

  return merged
}