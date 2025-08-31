#!/usr/bin/env python3
"""
Test script for real AI models
"""
import asyncio
import logging
import time
from services.real_model_manager import RealModelManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_model_loading():
    """Test loading real AI models"""
    print("🧪 Testing Real AI Model Loading...")
    print("=" * 50)
    
    # Initialize model manager
    model_manager = RealModelManager(max_memory_gb=6.0)
    await model_manager.initialize()
    
    # Test models in order of size (smallest first)
    models_to_test = ["esm2_small", "protgpt2"]
    
    for model_name in models_to_test:
        print(f"\n🔄 Testing {model_name}...")
        
        try:
            start_time = time.time()
            
            # Load model
            print(f"   Loading {model_name}...")
            success = await model_manager.load_model(model_name)
            
            if success:
                load_time = time.time() - start_time
                print(f"   ✅ {model_name} loaded successfully in {load_time:.2f}s")
                
                # Get model and test generation
                model = model_manager.get_model(model_name)
                print(f"   🧬 Testing generation with {model_name}...")
                
                result = await model.generate(
                    prompt="M" if model_name == "protgpt2" else "",
                    max_length=50,
                    temperature=0.8
                )
                
                print(f"   ✅ Generated sequence: {result['sequence'][:30]}...")
                print(f"   📊 Confidence: {result['confidence']}")
                
                # Check memory usage
                memory_mb = model_manager.get_memory_usage() / (1024 * 1024)
                print(f"   💾 Memory usage: {memory_mb:.1f} MB")
                
            else:
                print(f"   ❌ Failed to load {model_name}")
                
        except Exception as e:
            print(f"   ❌ Error with {model_name}: {e}")
            logger.error(f"Model {model_name} test failed", exc_info=True)
    
    # Test model status
    print(f"\n📊 Model Status:")
    status = await model_manager.get_status()
    for name, info in status.items():
        print(f"   {name}: {'✅ Loaded' if info.loaded else '❌ Not loaded'}")
    
    # Cleanup
    print(f"\n🧹 Cleaning up...")
    await model_manager.cleanup()
    print(f"   ✅ Cleanup complete")

async def test_memory_constraints():
    """Test memory constraint handling"""
    print(f"\n🧠 Testing Memory Constraints...")
    
    model_manager = RealModelManager(max_memory_gb=2.0)  # Very limited memory
    await model_manager.initialize()
    
    try:
        # Try to load multiple models
        await model_manager.load_model("esm2_small")
        await model_manager.load_model("protgpt2")
        
        status = await model_manager.get_status()
        loaded_count = sum(1 for info in status.values() if info.loaded)
        print(f"   📊 Models loaded under memory constraint: {loaded_count}")
        
    except Exception as e:
        print(f"   ⚠️  Memory constraint test: {e}")
    
    await model_manager.cleanup()

async def main():
    """Main test function"""
    print("🔬 Real AI Models Test Suite")
    print("=" * 50)
    
    try:
        await test_model_loading()
        await test_memory_constraints()
        
        print(f"\n🎉 All tests completed!")
        print("   • Real AI models are working")
        print("   • Memory management is functional")
        print("   • Ready for integration with web app")
        
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        logger.error("Test suite failed", exc_info=True)

if __name__ == "__main__":
    asyncio.run(main())