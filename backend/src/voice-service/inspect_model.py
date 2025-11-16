"""
Inspect the h5 model structure without loading it
"""
import h5py
import json

model_path = "./src/models/emotion_bilstm_final.h5"

print("🔍 Inspecting Model Structure")
print("=" * 50)

with h5py.File(model_path, 'r') as f:
    # Get model config
    if 'model_config' in f.attrs:
        config_str = f.attrs['model_config']
        if isinstance(config_str, bytes):
            config_str = config_str.decode('utf-8')
        
        config = json.loads(config_str)
        
        print("\n📋 Model Configuration:")
        print(json.dumps(config, indent=2))
        
        print("\n🔧 Layers:")
        for i, layer in enumerate(config['config']['layers']):
            print(f"\n{i+1}. {layer['class_name']} - '{layer['config']['name']}'")
            if 'inbound_nodes' in layer:
                print(f"   Inputs: {layer['inbound_nodes']}")
    
    print("\n\n💾 Model Weights:")
    def print_weights(name, obj):
        if isinstance(obj, h5py.Dataset):
            print(f"  {name}: shape={obj.shape}, dtype={obj.dtype}")
    
    if 'model_weights' in f:
        f['model_weights'].visititems(print_weights)
